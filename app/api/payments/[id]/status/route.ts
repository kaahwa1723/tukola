import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { getSessionUser } from '@/lib/session';
import { getPaymentProvider } from '@/lib/payments/provider';
import { transitionPayment } from '@/lib/escrow';

type Params = { params: { id: string } };

/**
 * GET /api/payments/[id]/status
 *
 * Polls the provider for the transaction state and settles the escrow row:
 * a successful debit moves pending → held. Safe to poll forever — every
 * step is idempotent. Only the payer or payee may check.
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const sb = createServerSupabase();
    const { data: payment } = await sb
      .from('payments')
      .select('*')
      .eq('id', Number(params.id))
      .maybeSingle();

    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    if (payment.payer_id !== user.id && payment.payee_id !== user.id) {
      return NextResponse.json({ error: 'Only the parties of this payment can view it' }, { status: 403 });
    }

    // Already past collection? Just report.
    if (payment.status !== 'pending' || !payment.provider_ref) {
      return NextResponse.json({ payment });
    }

    const provider = getPaymentProvider();
    const tx = await provider.getTransactionStatus(payment.provider_ref);

    if (tx.status === 'successful') {
      await transitionPayment(payment.id, 'held');
    } else if (tx.status === 'failed') {
      await transitionPayment(payment.id, 'refunded');
    }

    const { data: updated } = await sb.from('payments').select('*').eq('id', payment.id).single();
    return NextResponse.json({ payment: updated });
  } catch (err: any) {
    console.error('[GET /api/payments/[id]/status]', err);
    return NextResponse.json({ error: 'Could not check payment status.' }, { status: 500 });
  }
}
