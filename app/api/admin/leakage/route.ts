import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { isAdmin } from '@/lib/admin-auth';

/**
 * GET /api/admin/leakage
 *
 * Read-only leakage overview for the admin portal. Leakage = chats that
 * mention phone numbers or direct-payment keywords — a sign the deal may
 * be moving off-platform (log-don't-block: the message always sends).
 *
 *   events  — newest 200 signals, with the sender's name and job title
 *             joined in. We store WHICH signal matched, never the
 *             message text (privacy choice, see migration 011).
 *   summary — total signals, this week's signals, and how many happened
 *             in chats where money was NOT yet protected in escrow (the
 *             risky ones).
 *
 * Every count is a real query against leakage_events.
 */
function weekStart(): string {
  const now = new Date();
  const monday = new Date(now);
  const day = (now.getDay() + 6) % 7; // Monday = 0
  monday.setDate(now.getDate() - day);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString();
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const sb = createServerSupabase();

    const [
      { data: rows, error },
      { count: totalCount },
      { count: weekCount },
      { count: unprotectedCount },
    ] = await Promise.all([
      sb.from('leakage_events').select('*').order('created_at', { ascending: false }).limit(200),
      sb.from('leakage_events').select('*', { count: 'exact', head: true }),
      sb.from('leakage_events').select('*', { count: 'exact', head: true }).gte('created_at', weekStart()),
      sb.from('leakage_events').select('*', { count: 'exact', head: true }).eq('had_captured_payment', false),
    ]);
    if (error) throw error;

    // Join sender names and job titles
    const userIds = Array.from(new Set((rows ?? []).map(r => r.from_id).filter(Boolean)));
    const jobIds  = Array.from(new Set((rows ?? []).map(r => r.job_id).filter(Boolean)));

    const nameById = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: profiles } = await sb.from('profiles').select('id, name').in('id', userIds);
      (profiles ?? []).forEach(p => nameById.set(p.id, p.name));
    }
    const jobById = new Map<string, string>();
    if (jobIds.length > 0) {
      const { data: jobs } = await sb.from('jobs').select('id, title').in('id', jobIds);
      (jobs ?? []).forEach(j => jobById.set(j.id, j.title));
    }

    const events = (rows ?? []).map(r => ({
      id: r.id,
      fromId: r.from_id,
      fromName: r.from_id ? (nameById.get(r.from_id) ?? 'Unknown user') : 'Unknown user',
      jobId: r.job_id ?? undefined,
      jobTitle: r.job_id ? (jobById.get(r.job_id) ?? undefined) : undefined,
      signals: String(r.matched ?? '').split(',').filter(Boolean),
      hadCapturedPayment: !!r.had_captured_payment,
      createdAt: r.created_at,
    }));

    return NextResponse.json({
      events,
      summary: {
        totalAllTime: totalCount ?? 0,
        thisWeek: weekCount ?? 0,
        withoutPaymentProtected: unprotectedCount ?? 0,
      },
    });
  } catch (err: any) {
    console.error('[GET /api/admin/leakage]', err);
    return NextResponse.json({ error: 'Could not load leakage events.' }, { status: 500 });
  }
}
