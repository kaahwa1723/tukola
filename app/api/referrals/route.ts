import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { track } from '@/lib/analytics';
import {
  getOrCreateReferralCode,
  getCreditBalance,
  getReferralCount,
  CUSTOMER_REFERRAL_CREDIT_UGX,
  FUNDI_REFERRER_CREDIT_UGX,
  FUNDI_REFEREE_CREDIT_UGX,
} from '@/lib/referrals';

/**
 * GET /api/referrals
 *
 * My referral summary for the "Invite & earn" block: my code (minted
 * lazily on first view), my credit balance (ledger sum — never a stored
 * number), and how many people I've referred. Session-derived identity
 * only — no client-supplied user IDs.
 *
 * POST /api/referrals
 *
 * Share tracking: the client POSTs when the user taps the WhatsApp share
 * link. Body: { channel?: string } (defaults to 'whatsapp'). Server-side
 * tracking keeps the event unfakeable-by-accident; it is still a
 * self-reported tap, so it measures intent, not deliveries.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const [code, creditBalance, referralCount] = await Promise.all([
      getOrCreateReferralCode(user.id),
      getCreditBalance(user.id),
      getReferralCount(user.id),
    ]);

    return NextResponse.json({
      code,
      creditBalanceUgx: creditBalance,
      referralCount,
      // Amounts echoed so the UI never hardcodes the rules
      rewards: user.role === 'employer'
        ? { kind: 'customer', bothSidesUgx: CUSTOMER_REFERRAL_CREDIT_UGX }
        : { kind: 'fundi', referrerUgx: FUNDI_REFERRER_CREDIT_UGX, refereeUgx: FUNDI_REFEREE_CREDIT_UGX },
    });
  } catch (err: any) {
    console.error('[GET /api/referrals]', err);
    return NextResponse.json({ error: 'Could not load referrals. Please try again.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const body = await req.json().catch(() => ({}));
    track('referral_shared', user.id, { channel: body?.channel ?? 'whatsapp' });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[POST /api/referrals]', err);
    return NextResponse.json({ error: 'Could not track the share.' }, { status: 500 });
  }
}
