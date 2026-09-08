import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { isAdmin } from '@/lib/admin-auth';

/**
 * GET /api/admin/referrals
 *
 * Read-only referral overview for the admin portal:
 *   referrals  — every attribution (referrer → referee), newest first,
 *                with names/phones joined from profiles
 *   totals     — credit ledger sums: issued (earned), used (redeemed),
 *                expired, and still available (outstanding)
 *   balances   — per-user credit position, biggest balance first
 *
 * Every number is a real query against referrals / referral_credits /
 * profiles — balances are ledger sums, never stored counters
 * (lib/referrals.ts discipline). Nothing here is estimated.
 */
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const sb = createServerSupabase();

    const [
      { data: referralRows, error: refErr },
      { data: creditRows, error: credErr },
    ] = await Promise.all([
      sb.from('referrals').select('*').order('created_at', { ascending: false }).limit(500),
      sb.from('referral_credits').select('user_id, amount_ugx, kind, created_at'),
    ]);
    if (refErr) throw refErr;
    if (credErr) throw credErr;

    // Join names/phones for everyone involved (referrers, referees, credit holders)
    const userIds = new Set<string>();
    (referralRows ?? []).forEach(r => { userIds.add(r.referrer_id); userIds.add(r.referee_id); });
    (creditRows ?? []).forEach(c => userIds.add(c.user_id));

    const nameById = new Map<string, { name: string; phone: string }>();
    if (userIds.size > 0) {
      const { data: profiles } = await sb
        .from('profiles')
        .select('id, name, phone')
        .in('id', Array.from(userIds));
      (profiles ?? []).forEach(p => nameById.set(p.id, { name: p.name, phone: p.phone }));
    }

    const referrals = (referralRows ?? []).map(r => ({
      id: r.id,
      referrerId: r.referrer_id,
      referrerName: nameById.get(r.referrer_id)?.name ?? 'Unknown user',
      refereeId: r.referee_id,
      refereeName: nameById.get(r.referee_id)?.name ?? 'Unknown user',
      refereeRole: r.referee_role as 'worker' | 'employer',
      code: r.code,
      status: r.status as 'pending' | 'rewarded',
      createdAt: r.created_at,
      rewardedAt: r.rewarded_at ?? undefined,
    }));

    // Ledger sums
    let issuedUgx = 0, redeemedUgx = 0, expiredUgx = 0;
    const perUser = new Map<string, { earned: number; redeemed: number; expired: number }>();
    for (const c of creditRows ?? []) {
      const entry = perUser.get(c.user_id) ?? { earned: 0, redeemed: 0, expired: 0 };
      if (c.kind === 'earned')        { issuedUgx   += c.amount_ugx; entry.earned   += c.amount_ugx; }
      else if (c.kind === 'redeemed') { redeemedUgx += c.amount_ugx; entry.redeemed += c.amount_ugx; }
      else                            { expiredUgx  += c.amount_ugx; entry.expired  += c.amount_ugx; }
      perUser.set(c.user_id, entry);
    }

    const balances = Array.from(perUser.entries())
      .map(([userId, e]) => ({
        userId,
        name: nameById.get(userId)?.name ?? 'Unknown user',
        phone: nameById.get(userId)?.phone ?? '',
        earnedUgx: e.earned,
        redeemedUgx: e.redeemed,
        expiredUgx: e.expired,
        balanceUgx: Math.max(0, e.earned - e.redeemed - e.expired),
      }))
      .sort((a, b) => b.balanceUgx - a.balanceUgx);

    return NextResponse.json({
      referrals,
      totals: {
        issuedUgx,
        redeemedUgx,
        expiredUgx,
        outstandingUgx: issuedUgx - redeemedUgx - expiredUgx,
        pendingCount: referrals.filter(r => r.status === 'pending').length,
        rewardedCount: referrals.filter(r => r.status === 'rewarded').length,
      },
      balances,
    });
  } catch (err: any) {
    console.error('[GET /api/admin/referrals]', err);
    return NextResponse.json({ error: 'Could not load referrals.' }, { status: 500 });
  }
}
