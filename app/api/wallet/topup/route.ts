import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { getSessionUser } from '@/lib/session';
import { normalizeUgPhone } from '@/lib/phone';
import { getPaymentProvider } from '@/lib/payments/provider';
import { reportError } from '@/lib/error-report';

const MIN_TOPUP_UGX = 1_000;
const MAX_TOPUP_UGX = 5_000_000;

/**
 * POST /api/wallet/topup — { amountUgx, momoPhone }
 *
 * Starts a MoMo collection into the user's Tukola wallet. The customer
 * gets the usual USSD push + PIN. The money is NOT spendable until the
 * provider confirms (webhook or the wallet endpoint's read-settle) —
 * only then does the append-only ledger get the credit row.
 *
 * Idempotent per (user, amount) within 60s: a double-tap returns the
 * in-flight top-up instead of sending two USSD prompts.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const amountUgx = Number(body?.amountUgx);
    const momoPhone = normalizeUgPhone(body?.momoPhone);

    if (!Number.isInteger(amountUgx) || amountUgx < MIN_TOPUP_UGX || amountUgx > MAX_TOPUP_UGX) {
      return NextResponse.json(
        { error: `Enter an amount between UGX ${MIN_TOPUP_UGX.toLocaleString()} and ${MAX_TOPUP_UGX.toLocaleString()}.` },
        { status: 400 }
      );
    }
    if (!momoPhone) {
      return NextResponse.json({ error: 'A valid Uganda MoMo number is required.' }, { status: 400 });
    }

    const sb = createServerSupabase();

    // Double-tap guard: an identical pending top-up in the last 60s wins
    const { data: recent } = await sb
      .from('wallet_topups')
      .select('*')
      .eq('user_id', user.id)
      .eq('amount_ugx', amountUgx)
      .eq('status', 'pending')
      .gte('created_at', new Date(Date.now() - 60_000).toISOString())
      .order('created_at', { ascending: false })
      .limit(1);
    if (recent && recent.length > 0) {
      return NextResponse.json({ topup: recent[0], idempotent: true });
    }

    const provider = getPaymentProvider();
    const idempotencyKey = `topup_${user.id}_${Date.now()}`;

    const { data: topup, error } = await sb
      .from('wallet_topups')
      .insert({
        user_id: user.id,
        amount_ugx: amountUgx,
        momo_phone: momoPhone,
        status: 'pending',
        provider: provider.name,
        idempotency_key: idempotencyKey,
      })
      .select()
      .single();
    if (error) throw error;

    const tx = await provider.requestToPay({
      phone: momoPhone,
      amountUgx,
      externalRef: idempotencyKey,
      narration: 'Tukola wallet top-up',
    });

    await sb
      .from('wallet_topups')
      .update({ provider_ref: tx.providerRef })
      .eq('id', topup.id);

    if (tx.status === 'failed') {
      await sb
        .from('wallet_topups')
        .update({ status: 'failed', settled_at: new Date().toISOString() })
        .eq('id', topup.id);
      return NextResponse.json({ error: 'The MoMo debit was declined. Please try again.' }, { status: 402 });
    }

    return NextResponse.json({
      topup: { ...topup, provider_ref: tx.providerRef },
      ussdPushSent: true,
      message: 'Check the phone for the MoMo prompt and enter the PIN to approve.',
    }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/wallet/topup]', err);
    reportError('wallet.topup', err, { route: 'POST /api/wallet/topup' });
    return NextResponse.json({ error: 'Could not start the top-up. Please try again.' }, { status: 500 });
  }
}
