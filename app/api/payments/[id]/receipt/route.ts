import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { getSessionUser } from '@/lib/session';
import { isAdmin } from '@/lib/admin-auth';

type Params = { params: { id: string } };

/**
 * GET /api/payments/[id]/receipt
 *
 * EFRIS-ready receipt for a released payment. Fields required for
 * EFRIS-compliant invoicing: receipt number, timestamp, seller identity
 * (TIN placeholder until URA registration), itemized service, amount.
 * Visible to the payment's parties and admins only.
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const user = await getSessionUser(req);
    const admin = isAdmin(req);
    if (!user && !admin) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const sb = createServerSupabase();
    const { data: payment } = await sb
      .from('payments')
      .select('*, jobs(title, description), payer:profiles!payments_payer_id_fkey(name), payee:profiles!payments_payee_id_fkey(name)')
      .eq('id', Number(params.id))
      .maybeSingle();

    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    if (!admin && user && payment.payer_id !== user.id && payment.payee_id !== user.id) {
      return NextResponse.json({ error: 'Only the parties of this payment can view the receipt' }, { status: 403 });
    }
    if (payment.status !== 'released') {
      return NextResponse.json({ error: 'Receipt is available once the payment is released' }, { status: 409 });
    }

    return NextResponse.json({
      receipt: {
        receiptNumber: payment.receipt_number,
        issuedAt: payment.released_at,
        // Seller identity — TIN placeholder until URA registration completes
        seller: {
          name: 'Tukola Ltd',
          tin: process.env.TUKOLA_TIN ?? 'TIN-PENDING-REGISTRATION',
        },
        buyer: { name: payment.payer?.name ?? null },
        fundi: { name: payment.payee?.name ?? null },
        items: [
          {
            description: payment.jobs?.title ?? 'Service',
            quantity: 1,
            unitPriceUgx: payment.amount,
            totalUgx: payment.amount,
          },
        ],
        totals: {
          grossUgx: payment.amount,
          fundiPayoutUgx: payment.fundi_payout,
          platformCommissionUgx: payment.commission,
          guaranteeAccrualUgx: payment.guarantee_accrual,
          pspFeeUgx: payment.psp_fee ?? 0,
        },
        provider: payment.provider,
        providerRef: payment.provider_ref,
        currency: 'UGX',
      },
    });
  } catch (err: any) {
    console.error('[GET /api/payments/[id]/receipt]', err);
    return NextResponse.json({ error: 'Could not load the receipt.' }, { status: 500 });
  }
}
