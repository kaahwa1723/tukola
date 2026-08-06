import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { transitionPayment } from '@/lib/escrow';
import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * POST /api/payments/webhook
 * Body: { providerRef, status: 'successful'|'failed', signature }
 *
 * Provider callbacks land here. Requirements:
 *   - authenticated: HMAC-SHA256 signature of providerRef over the raw body
 *     secret (PAYMENT_WEBHOOK_SECRET env) — unsigned callbacks are ignored;
 *   - idempotent: a replayed callback is a no-op — the state machine
 *     ignores already-final payments.
 *
 * Note: MTN MoMo's real callback shape differs per product; the adapter
 * normalizes to { providerRef, status } before this logic runs.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const secret = process.env.PAYMENT_WEBHOOK_SECRET;
    if (!secret) {
      console.error('[payments/webhook] PAYMENT_WEBHOOK_SECRET not configured');
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
    }

    const signature = req.headers.get('x-webhook-signature') ?? '';
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    const a = Buffer.from(signature, 'utf8');
    const b = Buffer.from(expected, 'utf8');
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const { providerRef, status } = JSON.parse(rawBody);
    if (!providerRef || !['successful', 'failed'].includes(status)) {
      return NextResponse.json({ error: 'providerRef and a valid status are required' }, { status: 400 });
    }

    const sb = createServerSupabase();
    const { data: payment } = await sb
      .from('payments')
      .select('id, status')
      .eq('provider_ref', providerRef)
      .maybeSingle();

    if (!payment) {
      // Unknown reference — acknowledge so the provider stops retrying,
      // but flag it for reconciliation
      console.warn('[payments/webhook] unknown providerRef:', providerRef);
      return NextResponse.json({ received: true, matched: false });
    }

    // Idempotent replay: the payment already left 'pending' — the callback
    // is a duplicate (or arrived after a manual settle). Acknowledge, no-op.
    if (payment.status !== 'pending') {
      return NextResponse.json({ received: true, matched: true, replay: true });
    }

    if (status === 'successful') {
      await transitionPayment(payment.id, 'held');
    } else {
      await transitionPayment(payment.id, 'refunded');
    }

    return NextResponse.json({ received: true, matched: true });
  } catch (err: any) {
    console.error('[POST /api/payments/webhook]', err);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
