import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { getSessionUser } from '@/lib/session';
import { debitWallet, getWalletBalance, InsufficientFundsError } from '@/lib/wallet';
import { getPaymentProvider } from '@/lib/payments/provider';
import { reportError } from '@/lib/error-report';

const MIN_WITHDRAW_UGX = 1_000;

/**
 * POST /api/wallet/withdraw — { amountUgx? }  (default: full balance)
 *
 * Cash out wallet balance to the user's MoMo payout number (falls back to
 * their login phone). The payout is attempted FIRST; the wallet is debited
 * only on confirmed success, so a failed withdrawal never loses money.
 *
 * NOTE: if the provider settles payouts asynchronously (status 'pending'),
 * we do NOT debit — the user is told to retry later. A genuinely async
 * payout rail needs a pending-withdrawal state; add it if RukaPay's
 * disbursement turns out to be async in production.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const sb = createServerSupabase();
    const body = await req.json().catch(() => ({}));
    const balance = await getWalletBalance(sb, user.id);
    const amountUgx = body?.amountUgx ? Number(body.amountUgx) : balance;

    if (!Number.isInteger(amountUgx) || amountUgx < MIN_WITHDRAW_UGX) {
      return NextResponse.json(
        { error: `The minimum withdrawal is UGX ${MIN_WITHDRAW_UGX.toLocaleString()}.` },
        { status: 400 }
      );
    }
    if (amountUgx > balance) {
      return NextResponse.json(
        { error: `Your wallet has ${balance.toLocaleString()} UGX — you can't withdraw more than that.` },
        { status: 402 }
      );
    }

    const { data: profile } = await sb
      .from('profiles')
      .select('phone, momo_payout_phone, name')
      .eq('id', user.id)
      .maybeSingle();
    const targetPhone = profile?.momo_payout_phone ?? profile?.phone;
    if (!targetPhone) {
      return NextResponse.json(
        { error: 'Add your Mobile Money payout number on your profile first.' },
        { status: 400 }
      );
    }

    const provider = getPaymentProvider();
    const ref = `wd_${user.id}_${Date.now()}`;
    const payout = await provider.payout({
      phone: targetPhone,
      amountUgx,
      externalRef: ref,
      narration: 'Tukola wallet cash-out',
    });

    if (payout.status !== 'successful') {
      return NextResponse.json(
        { error: 'The cash-out could not be completed right now. Your money is safe — please try again in a few minutes.' },
        { status: 502 }
      );
    }

    // Money is on its way — now debit the ledger (idempotent per withdrawal)
    try {
      await debitWallet(sb, {
        userId: user.id,
        kind: 'withdrawal',
        amountUgx,
        idempotencyKey: `withdrawal_${ref}`,
        note: `Cash-out to ${targetPhone}`,
      });
    } catch (e) {
      // The payout SUCCEEDED but the ledger debit failed — money left the
      // platform without a record. Wake the founder immediately.
      reportError('wallet.withdraw.ledger', e, { userId: user.id, amountUgx, ref });
      throw e;
    }

    return NextResponse.json({ ok: true, amountUgx, phone: targetPhone, balance: balance - amountUgx });
  } catch (err: any) {
    if (err instanceof InsufficientFundsError) {
      return NextResponse.json({ error: 'Insufficient wallet balance.' }, { status: 402 });
    }
    console.error('[POST /api/wallet/withdraw]', err);
    reportError('wallet.withdraw', err, { route: 'POST /api/wallet/withdraw' });
    return NextResponse.json({ error: 'Cash-out failed. Please try again.' }, { status: 500 });
  }
}
