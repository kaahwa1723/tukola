import { createServerSupabase } from './supabase-server';
import { getPaymentProvider } from './payments/provider';

/**
 * Escrow — state machine + money math.
 *
 * States: pending → held → released | refunded | disputed
 *   (no other transitions are legal; enforced here, not by convention)
 *
 * Split on release (per the rebuild plan):
 *   - fundi payout  = amount − commission
 *   - commission    = 17% of GMV (15% for B2B-flagged jobs)
 *   - guarantee     = 2% of GMV, accrued FROM the platform's commission
 *                     into the guarantee_reserve ledger
 *   - platform net  = commission − guarantee_accrual − psp_fee
 * ASSUMPTION (flagged to founder): the 2% guarantee accrual comes out of
 * the platform's 17%, not on top of it — the fundi always gets exactly
 * 83% (85% B2B). If the 2% should come off the fundi's side instead,
 * change computeSplit() — one place.
 */

export const COMMISSION_RATE = 0.17;
export const COMMISSION_RATE_B2B = 0.15;
export const GUARANTEE_RATE = 0.02;

export interface Split {
  commission: number;
  guaranteeAccrual: number;
  fundiPayout: number;
}

export function computeSplit(amountUgx: number, isB2b: boolean): Split {
  const commission = Math.round(amountUgx * (isB2b ? COMMISSION_RATE_B2B : COMMISSION_RATE));
  const guaranteeAccrual = Math.round(amountUgx * GUARANTEE_RATE);
  const fundiPayout = amountUgx - commission;
  return { commission, guaranteeAccrual, fundiPayout };
}

/** Legal escrow transitions. Anything not listed here is rejected. */
const LEGAL_TRANSITIONS: Record<string, string[]> = {
  pending: ['held', 'refunded'],          // refunded from pending = debit failed/cancelled
  held: ['released', 'refunded', 'disputed'],
  disputed: ['released', 'refunded'],     // admin resolves
  released: [],                            // terminal
  refunded: [],                            // terminal
};

export function canTransition(from: string, to: string): boolean {
  return (LEGAL_TRANSITIONS[from] ?? []).includes(to);
}

export class IllegalTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`Illegal payment state transition: ${from} → ${to}`);
  }
}

/**
 * Move a payment to a new status, enforcing the state machine.
 * Idempotent: asking for the CURRENT state again is a no-op (safe retries).
 */
export async function transitionPayment(paymentId: number, to: string): Promise<void> {
  const sb = createServerSupabase();
  const { data: payment } = await sb.from('payments').select('status').eq('id', paymentId).single();
  if (!payment) throw new Error(`Payment ${paymentId} not found`);

  if (payment.status === to) return; // idempotent no-op
  if (!canTransition(payment.status, to)) {
    throw new IllegalTransitionError(payment.status, to);
  }

  const stamp: Record<string, unknown> = { status: to };
  if (to === 'held') stamp.held_at = new Date().toISOString();
  if (to === 'released') stamp.released_at = new Date().toISOString();
  if (to === 'refunded') stamp.refunded_at = new Date().toISOString();
  if (to === 'disputed') stamp.disputed_at = new Date().toISOString();

  const { error } = await sb.from('payments').update(stamp).eq('id', paymentId);
  if (error) throw error;
}

/**
 * Release escrow: compute splits, write the guarantee accrual ledger row,
 * pay the fundi, assign the EFRIS receipt number. Idempotent — a payment
 * already 'released' returns its existing numbers without re-paying.
 */
export async function releasePayment(paymentId: number): Promise<{
  receiptNumber: string;
  split: Split;
}> {
  const sb = createServerSupabase();
  const { data: payment } = await sb.from('payments').select('*, jobs(is_b2b)').eq('id', paymentId).single();
  if (!payment) throw new Error(`Payment ${paymentId} not found`);

  // Idempotent: already released → return existing values, do NOT pay out again
  if (payment.status === 'released') {
    return {
      receiptNumber: payment.receipt_number,
      split: {
        commission: payment.commission,
        guaranteeAccrual: payment.guarantee_accrual,
        fundiPayout: payment.fundi_payout,
      },
    };
  }
  if (!canTransition(payment.status, 'released')) {
    throw new IllegalTransitionError(payment.status, 'released');
  }

  const split = computeSplit(payment.amount, payment.jobs?.is_b2b ?? false);
  const receiptNumber = `TKL-${new Date().getFullYear()}-${String(payment.id).padStart(6, '0')}`;

  // 1. Pay the fundi (in real life: MoMo disbursement; mock: instant success)
  const provider = getPaymentProvider();
  if (payment.payee_momo_phone) {
    const payout = await provider.payout({
      phone: payment.payee_momo_phone,
      amountUgx: split.fundiPayout,
      externalRef: `payout_${payment.idempotency_key}`,
      narration: `Tukola job payment ${receiptNumber}`,
    });
    if (payout.status !== 'successful') {
      throw new Error(`Fundi payout did not succeed (status: ${payout.status}) — payment left in escrow`);
    }
  }

  // 2. Guarantee accrual — append-only ledger row
  const { error: ledgerError } = await sb.from('guarantee_reserve').insert({
    payment_id: payment.id,
    entry_type: 'accrual',
    amount: split.guaranteeAccrual,
    note: `2% guarantee accrual on payment #${payment.id}`,
  });
  if (ledgerError) throw ledgerError;

  // 3. Record the split + receipt + state on the payment
  const { error } = await sb
    .from('payments')
    .update({
      status: 'released',
      released_at: new Date().toISOString(),
      commission: split.commission,
      guarantee_accrual: split.guaranteeAccrual,
      fundi_payout: split.fundiPayout,
      receipt_number: receiptNumber,
    })
    .eq('id', payment.id);
  if (error) throw error;

  return { receiptNumber, split };
}
