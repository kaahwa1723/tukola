import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { getPaymentProvider } from '@/lib/payments/provider';
import { isCronAuthorized } from '@/lib/cron-auth';

/**
 * GET /api/cron/reconcile
 *
 * Daily reconciliation: compares every non-final payment against its
 * provider's record and flags mismatches. A payment stuck 'pending' whose
 * provider says SUCCESSFUL (or vice versa) means money moved that our
 * ledger doesn't reflect — those get flagged for manual review.
 *
 * Secured by CRON_SECRET (x-cron-secret header or Authorization: Bearer).
 */
export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const sb = createServerSupabase();
    const provider = getPaymentProvider();

    const { data: nonFinal } = await sb
      .from('payments')
      .select('id, status, provider_ref, amount, created_at')
      .in('status', ['pending', 'held'])
      .order('created_at', { ascending: true });

    const mismatches: { id: number; ledger: string; provider: string }[] = [];
    const errors: { id: number; error: string }[] = [];

    for (const payment of nonFinal ?? []) {
      if (!payment.provider_ref) continue;
      try {
        const tx = await provider.getTransactionStatus(payment.provider_ref);
        // Mismatch: provider says the money arrived but ledger isn't held/released,
        // or provider says it failed but ledger thinks it's held
        if (tx.status === 'successful' && payment.status === 'pending') {
          mismatches.push({ id: payment.id, ledger: payment.status, provider: 'successful' });
        }
        if (tx.status === 'failed' && payment.status === 'held') {
          mismatches.push({ id: payment.id, ledger: payment.status, provider: 'failed' });
        }
      } catch (e: any) {
        errors.push({ id: payment.id, error: e.message });
      }
    }

    // Stuck pending for over 24h is a mismatch class of its own
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const stuck = (nonFinal ?? []).filter(p => p.status === 'pending' && p.created_at < dayAgo);

    return NextResponse.json({
      checked: (nonFinal ?? []).length,
      mismatches,
      stuckPendingOver24h: stuck.map(p => p.id),
      providerErrors: errors,
      ranAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[GET /api/cron/reconcile]', err);
    return NextResponse.json({ error: 'Reconciliation failed.' }, { status: 500 });
  }
}
