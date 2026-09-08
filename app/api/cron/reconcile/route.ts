import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { getPaymentProvider } from '@/lib/payments/provider';
import { computeSplit } from '@/lib/escrow';
import { isCronAuthorized } from '@/lib/cron-auth';

/**
 * GET /api/cron/reconcile
 *
 * Daily reconciliation: compares the payments ledger against expectation
 * and records every mismatch as an OPEN row in reconciliation_flags
 * (migration 010), reviewed from /admin/analytics.
 *
 * Checks:
 *   1. Provider disagreement — ledger says pending/held but the payment
 *      provider says successful/failed (money moved that our ledger
 *      doesn't reflect, or vice versa).
 *   2. Stuck states — pending > 24h (the customer never entered their
 *      MoMo PIN and nobody noticed); held > 72h (the 48h auto-release
 *      should have fired — something is wrong).
 *   3. Split math on released payments — guarantee accrual must equal
 *      2% of GMV (±1 UGX rounding); commission must not EXCEED the
 *      17%/15% (B2B) expectation (it can legitimately be LOWER after
 *      referral-credit redemption — see lib/escrow.ts releasePayment);
 *      commission + fundi payout must not exceed the amount collected.
 *   4. Missing receipts — a released payment without an EFRIS receipt
 *      number is a compliance gap.
 *
 * Dedupe: one OPEN flag per (payment, type) — enforced by a partial
 * unique index, and checked here before insert so the response can
 * report new vs already-known. Re-running the cron never stacks
 * duplicates.
 *
 * Secured by CRON_SECRET (x-cron-secret header or Authorization: Bearer).
 */

const STUCK_PENDING_MS = 24 * 60 * 60 * 1000;
const STUCK_HELD_MS    = 72 * 60 * 60 * 1000;
const MAX_RELEASED_SCAN = 500; // recent released payments to re-verify per run

type FlagType =
  | 'provider_mismatch'
  | 'provider_status_check_failed'
  | 'stuck_pending'
  | 'stuck_held'
  | 'commission_math_mismatch'
  | 'guarantee_math_mismatch'
  | 'over_distribution'
  | 'missing_receipt';

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const sb = createServerSupabase();
    const provider = getPaymentProvider();
    const now = Date.now();

    let newFlags = 0;
    let alreadyKnown = 0;
    const flagErrors: { paymentId: number; flagType: FlagType; error: string }[] = [];

    /** Insert an OPEN flag unless one already exists for (payment, type). */
    const flag = async (paymentId: number, flagType: FlagType, detail: Record<string, unknown>) => {
      try {
        const { data: existing } = await sb
          .from('reconciliation_flags')
          .select('id')
          .eq('payment_id', paymentId)
          .eq('flag_type', flagType)
          .eq('status', 'open')
          .maybeSingle();
        if (existing) { alreadyKnown++; return; }

        const { error } = await sb.from('reconciliation_flags').insert({
          payment_id: paymentId,
          flag_type: flagType,
          detail,
        });
        if (error) throw error;
        newFlags++;
      } catch (e: any) {
        flagErrors.push({ paymentId, flagType, error: e.message });
      }
    };

    // ── 1 & 2. Non-final payments: provider agreement + stuck states ──────
    const { data: nonFinal } = await sb
      .from('payments')
      .select('id, status, provider_ref, amount, created_at, held_at')
      .in('status', ['pending', 'held'])
      .order('created_at', { ascending: true });

    for (const payment of nonFinal ?? []) {
      // Provider disagreement (only when we have a provider reference)
      if (payment.provider_ref) {
        try {
          const tx = await provider.getTransactionStatus(payment.provider_ref);
          if (tx.status === 'successful' && payment.status === 'pending') {
            await flag(payment.id, 'provider_mismatch', {
              ledger: 'pending', provider: 'successful', providerRef: payment.provider_ref,
              note: 'Provider says the money arrived; ledger still pending.',
            });
          }
          if (tx.status === 'failed' && payment.status === 'held') {
            await flag(payment.id, 'provider_mismatch', {
              ledger: 'held', provider: 'failed', providerRef: payment.provider_ref,
              note: 'Ledger holds funds the provider says failed.',
            });
          }
        } catch (e: any) {
          await flag(payment.id, 'provider_status_check_failed', {
            providerRef: payment.provider_ref,
            error: e.message,
          });
        }
      }

      // Stuck states
      const createdAt = new Date(payment.created_at).getTime();
      if (payment.status === 'pending' && now - createdAt > STUCK_PENDING_MS) {
        await flag(payment.id, 'stuck_pending', {
          amount: payment.amount,
          pendingSince: payment.created_at,
          note: 'Pending over 24h — the MoMo prompt was likely never approved.',
        });
      }
      const heldAt = payment.held_at ? new Date(payment.held_at).getTime() : null;
      if (payment.status === 'held' && heldAt && now - heldAt > STUCK_HELD_MS) {
        await flag(payment.id, 'stuck_held', {
          amount: payment.amount,
          heldSince: payment.held_at,
          note: 'Held over 72h — the 48h auto-release should have fired.',
        });
      }
    }

    // ── 3 & 4. Released payments: split math + receipts ──────────────────
    const { data: released } = await sb
      .from('payments')
      .select('id, amount, commission, guarantee_accrual, fundi_payout, receipt_number, released_at, jobs(is_b2b)')
      .eq('status', 'released')
      .order('released_at', { ascending: false })
      .limit(MAX_RELEASED_SCAN);

    for (const payment of released ?? []) {
      const expected = computeSplit(payment.amount, (payment as any).jobs?.is_b2b ?? false);

      // Guarantee accrual is always 2% of GMV — referral credits never
      // touch it, so any drift is a real bug.
      if (payment.guarantee_accrual == null ||
          Math.abs(payment.guarantee_accrual - expected.guaranteeAccrual) > 1) {
        await flag(payment.id, 'guarantee_math_mismatch', {
          amount: payment.amount,
          expected: expected.guaranteeAccrual,
          actual: payment.guarantee_accrual,
        });
      }

      // Commission may legitimately be LOWER than the rate after
      // referral-credit redemption; it must never be HIGHER (or negative).
      if (payment.commission == null ||
          payment.commission < 0 ||
          payment.commission > expected.commission + 1) {
        await flag(payment.id, 'commission_math_mismatch', {
          amount: payment.amount,
          maxExpected: expected.commission,
          actual: payment.commission,
          note: 'Commission above the 17%/15% rate expectation (below it is normal after credit redemption).',
        });
      }

      // The platform can never pay out more than it collected.
      if (payment.commission != null && payment.fundi_payout != null &&
          payment.commission + payment.fundi_payout > payment.amount + 1) {
        await flag(payment.id, 'over_distribution', {
          amount: payment.amount,
          commission: payment.commission,
          fundiPayout: payment.fundi_payout,
          totalOut: payment.commission + payment.fundi_payout,
        });
      }
      if (payment.fundi_payout != null && payment.fundi_payout <= 0) {
        await flag(payment.id, 'over_distribution', {
          amount: payment.amount,
          fundiPayout: payment.fundi_payout,
          note: 'Fundi payout is zero or negative.',
        });
      }

      if (!payment.receipt_number) {
        await flag(payment.id, 'missing_receipt', {
          amount: payment.amount,
          releasedAt: payment.released_at,
          note: 'Released without an EFRIS receipt number.',
        });
      }
    }

    return NextResponse.json({
      checked: {
        nonFinal: (nonFinal ?? []).length,
        released: (released ?? []).length,
      },
      newFlags,
      alreadyKnown,
      flagErrors,
      ranAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[GET /api/cron/reconcile]', err);
    return NextResponse.json({ error: 'Reconciliation failed.' }, { status: 500 });
  }
}
