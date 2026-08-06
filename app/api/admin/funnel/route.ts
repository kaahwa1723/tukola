import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { isAdmin } from '@/lib/admin-auth';

/**
 * GET /api/admin/funnel
 *
 * This week's REAL funnel numbers — every count is a live database query.
 * Week starts Monday 00:00 local server time (the founder's Monday 9am
 * metrics review per the rebuild plan, Part 5.6).
 *
 * Also includes the standing weekly metrics:
 *   completion rate, dispute rate, guarantee reserve balance, GMV.
 */
function weekStart(): string {
  const now = new Date();
  const monday = new Date(now);
  const day = (now.getDay() + 6) % 7; // Monday = 0
  monday.setDate(now.getDate() - day);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString();
}

export async function GET(req: Request) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const sb = createServerSupabase();
    const since = weekStart();

    const count = async (table: string, column: string, extra?: (q: any) => any) => {
      let q = sb.from(table).select('*', { count: 'exact', head: true }).gte(column, since);
      if (extra) q = extra(q);
      const { count } = await q;
      return count ?? 0;
    };

    const [
      signup,
      otp_verified,
      job_posted,
      application_sent,
      applicant_accepted,
      payment_held,
      job_completed,
      payment_released,
      rating_submitted,
      dispute_opened,
    ] = await Promise.all([
      count('profiles', 'created_at'),
      count('otp_codes', 'created_at', q => q.eq('consumed', true)),
      count('jobs', 'created_at'),
      count('applications', 'applied_at'),
      count('applications', 'applied_at', q => q.eq('status', 'accepted')),
      count('payments', 'held_at'),
      count('jobs', 'completed_at'),
      count('payments', 'released_at'),
      count('ratings', 'created_at'),
      count('disputes', 'created_at'),
    ]);

    // Standing weekly metrics (Part 5.6)
    const completionRate = job_posted > 0 ? Math.round((job_completed / job_posted) * 100) : 0;
    const disputeRate = payment_held > 0 ? Math.round((dispute_opened / payment_held) * 100) : 0;

    // Guarantee reserve balance (append-only ledger, signed amounts)
    const { data: reserveRows } = await sb.from('guarantee_reserve').select('amount');
    const guaranteeReserveBalance = (reserveRows ?? []).reduce((sum, r) => sum + r.amount, 0);

    // This week's GMV = sum of released payment amounts
    const { data: releasedRows } = await sb
      .from('payments')
      .select('amount, commission')
      .eq('status', 'released')
      .gte('released_at', since);
    const gmv = (releasedRows ?? []).reduce((sum, r) => sum + r.amount, 0);
    const commissionRevenue = (releasedRows ?? []).reduce((sum, r) => sum + (r.commission ?? 0), 0);

    // Repeat-hire rate (90-day, demand side) — the retention gate (≥20%):
    // of employers with a completed job in the last 90 days, the share who
    // completed ≥2 jobs in that window.
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { data: completedRows } = await sb
      .from('jobs')
      .select('employer_id')
      .eq('status', 'completed')
      .gte('completed_at', ninetyDaysAgo);
    const byEmployer = new Map<string, number>();
    (completedRows ?? []).forEach(r => {
      byEmployer.set(r.employer_id, (byEmployer.get(r.employer_id) ?? 0) + 1);
    });
    const hiringEmployers = byEmployer.size;
    const repeatEmployers = Array.from(byEmployer.values()).filter(n => n >= 2).length;
    const repeatHireRate90d = hiringEmployers > 0 ? Math.round((repeatEmployers / hiringEmployers) * 100) : 0;

    // Leakage signals this week (chat off-platform attempts, log-don't-block)
    const leakageSignals = await count('leakage_events', 'created_at');

    return NextResponse.json({
      weekStarting: since,
      funnel: {
        signup,
        otp_verified,
        job_posted,
        application_sent,
        applicant_accepted,
        payment_held,
        job_completed,
        payment_released,
        rating_submitted,
        dispute_opened,
      },
      metrics: {
        completionRate,
        disputeRate,
        gmvUgx: gmv,
        commissionRevenueUgx: commissionRevenue,
        guaranteeReserveBalanceUgx: guaranteeReserveBalance,
        repeatHireRate90d,
        hiringEmployers90d: hiringEmployers,
        repeatEmployers90d: repeatEmployers,
        leakageSignals,
      },
    });
  } catch (err: any) {
    console.error('[GET /api/admin/funnel]', err);
    return NextResponse.json({ error: 'Could not load funnel.' }, { status: 500 });
  }
}
