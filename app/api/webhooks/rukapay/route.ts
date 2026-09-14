import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { transitionPayment } from '@/lib/escrow';
import { getPaymentProvider } from '@/lib/payments/provider';
import { settleTopup } from '@/lib/wallet';
import { reportError } from '@/lib/error-report';

/**
 * POST /api/webhooks/rukapay
 *
 * RukaPay Gateway callback (docs: developer.rukapay.co.ug/webhooks):
 *   { partnerReference, status: 'SUCCESS'|'FAILED', transactionId, mnoId,
 *     amount, fee, metadata, timestamp }
 * Headers: Content-Type: application/json, User-Agent: RukaPay-Gateway/1.0
 *
 * Security model: RukaPay callbacks carry NO signature, so the body is
 * treated as an untrusted HINT, never as proof. Before any state change we
 * re-query the transaction status server-to-server through the payment
 * provider (x-api-key authenticated). A spoofed callback can therefore
 * trigger at most one extra status lookup — it can never settle a payment.
 *
 * Idempotent: replays are no-ops (the escrow state machine ignores
 * already-final payments). Unknown references are acknowledged so RukaPay
 * stops retrying, and flagged for the reconcile cron.
 */
export async function POST(req: NextRequest) {
  try {
    const body: any = await req.json().catch(() => null);
    const partnerReference = body?.partnerReference;
    if (!partnerReference || typeof partnerReference !== 'string') {
      return NextResponse.json({ error: 'partnerReference required' }, { status: 400 });
    }

    const sb = createServerSupabase();
    const { data: payment } = await sb
      .from('payments')
      .select('id, status')
      .eq('provider_ref', partnerReference)
      .maybeSingle();

    if (!payment) {
      // Maybe it's a wallet top-up, not a job escrow payment
      const { data: topup } = await sb
        .from('wallet_topups')
        .select('id, user_id, amount_ugx, status')
        .eq('provider_ref', partnerReference)
        .maybeSingle();

      if (topup) {
        if (topup.status !== 'pending') {
          return NextResponse.json({ received: true, matched: true, replay: true });
        }
        // Same discipline as escrow: verify server-to-server before crediting
        const provider = getPaymentProvider();
        const tx = await provider.getTransactionStatus(partnerReference);
        if (tx.status !== 'pending') {
          await settleTopup(sb, topup, tx.status === 'successful' ? 'successful' : 'failed');
        }
        return NextResponse.json({ received: true, matched: true, wallet: true, verified: tx.status });
      }

      console.warn('[webhooks/rukapay] unknown partnerReference:', partnerReference);
      // Live-money signal: the provider says a transaction exists that our
      // ledger doesn't know. Alert, but still 200 so RukaPay doesn't retry-storm.
      reportError('webhook.unknown-reference', new Error('Webhook reference not in ledger'), { partnerReference });
      return NextResponse.json({ received: true, matched: false });
    }

    // Replay / already settled — acknowledge, no-op.
    if (payment.status !== 'pending') {
      return NextResponse.json({ received: true, matched: true, replay: true });
    }

    // Verify server-to-server before trusting the callback.
    const provider = getPaymentProvider();
    const tx = await provider.getTransactionStatus(partnerReference);

    if (tx.status === 'successful') {
      await transitionPayment(payment.id, 'held');
    } else if (tx.status === 'failed') {
      await transitionPayment(payment.id, 'refunded');
    }
    // 'pending' → leave it; the reconcile cron will settle it later.

    return NextResponse.json({ received: true, matched: true, verified: tx.status });
  } catch (err: any) {
    console.error('[POST /api/webhooks/rukapay]', err);
    reportError('webhook.rukapay', err, { route: 'POST /api/webhooks/rukapay' });
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
