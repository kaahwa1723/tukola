import { createServerSupabase } from './supabase-server';
import { getPaymentProvider } from './payments/provider';
import { track } from './analytics';
import { redeemCreditsForRelease, reverseRedemption } from './referrals';
import { sendPaymentHeldEmail, sendPaymentReleasedEmail } from './email/notify';
import { notifyJobEvent, notifyUser } from './notify';
import { reportError } from './error-report';
import { creditWallet } from './wallet';

/**
 * Escrow — state machine + money math.
 *
 * States: pending → held → released | refunded | disputed
 *   (no other transitions are legal; enforced here, not by convention)
 *
 * Split on release (per the rebuild plan):
 *   - fundi payout  = amount − commission
 *   - commission    = 10% flat launch rate on ALL jobs (incl. B2B-flagged)
 *   - guarantee     = 2% of GMV, accrued FROM the platform's commission
 *                     into the guarantee_reserve ledger
 *   - platform net  = commission − guarantee_accrual − psp_fee
 * ASSUMPTION (flagged to founder): the 2% guarantee accrual comes out of
 * the platform's 10%, not on top of it — the fundi always gets exactly
 * 90%. If the 2% should come off the fundi's side instead,
 * change computeSplit() — one place.
 * REPRICING (founder decision, Sept 2026): launch rate 10%, negotiable
 * band 7%–15%; path to 12–15% once density is proven. B2B rate kept at
 * 10% for launch — raise COMMISSION_RATE_B2B when B2B pricing is set.
 */

export const COMMISSION_RATE = 0.10;
export const COMMISSION_RATE_B2B = 0.10;
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
  const { data: payment } = await sb.from('payments').select('status, payer_id, payee_id, job_id, amount').eq('id', paymentId).single();
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

  if (to === 'held') {
    track('payment_held', payment.payer_id, { paymentId, jobId: payment.job_id, amount: payment.amount });
    // Tell the fundi escrow is funded and work can start — fire-and-forget
    // safe (skips silently when the fundi has no email on file).
    await sendPaymentHeldEmail({ fundiId: payment.payee_id, jobId: payment.job_id, amountUgx: payment.amount });
    // SMS too — most fundis check texts, not email (fire-and-forget).
    notifyJobEvent(sb, payment.job_id, payment.payee_id, (title) =>
      `Tukola: UGX ${Number(payment.amount).toLocaleString()} for "${title}" is now held safely. You can start the work — payment is guaranteed when the job is confirmed.`
    ).catch(() => {});
  }

  // Refund of money that was actually collected (held → refunded) lands in
  // the payer's Tukola wallet — instant, no MoMo payout fee, and it keeps
  // the money on-platform for their next job. pending → refunded means the
  // debit never happened, so NOTHING is credited (that would mint money).
  if (to === 'refunded' && payment.status === 'held') {
    await creditWallet(sb, {
      userId: payment.payer_id,
      kind: 'refund',
      amountUgx: Number(payment.amount),
      paymentId,
      idempotencyKey: `refund_${paymentId}`,
      note: 'Escrow refund to wallet',
    });
    notifyUser(sb, payment.payer_id,
      `Tukola: UGX ${Number(payment.amount).toLocaleString()} was refunded to your Tukola wallet. Open the app to see your balance.`
    ).catch(() => {});
  }
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

  // Referral credit redemption (Phase 2) — see lib/referrals.ts.
  // The payee's balance reduces the platform commission and is added to
  // the fundi payout; the payer's balance also reduces the commission and
  // is returned as cashback below. Capped at the commission, so credit
  // can never make any leg of the payment negative. The 2% guarantee
  // accrual is unchanged (computed from GMV, not post-credit commission).
  const redemption = await redeemCreditsForRelease(
    payment.id, payment.payer_id, payment.payee_id, split.commission
  );
  const commission = split.commission - redemption.payerRedeemed - redemption.payeeRedeemed;
  const fundiPayout = split.fundiPayout + redemption.payeeRedeemed;

  // 1. Pay the fundi — to their MoMo (default) or into their Tukola
  // wallet when they've chosen to batch cash-outs (fewer MoMo fees).
  const provider = getPaymentProvider();
  const { data: payeePref } = await sb
    .from('profiles')
    .select('payout_preference')
    .eq('id', payment.payee_id)
    .maybeSingle();
  const payToWallet = payeePref?.payout_preference === 'wallet';

  if (payToWallet) {
    await creditWallet(sb, {
      userId: payment.payee_id,
      kind: 'earnings',
      amountUgx: fundiPayout,
      paymentId: payment.id,
      idempotencyKey: `earnings_${payment.id}`,
      note: `Job earnings ${receiptNumber}`,
    });
  } else if (payment.payee_momo_phone) {
    const payout = await provider.payout({
      phone: payment.payee_momo_phone,
      amountUgx: fundiPayout,
      externalRef: `payout_${payment.idempotency_key}`,
      narration: `Tukola job payment ${receiptNumber}`,
    });
    if (payout.status !== 'successful') {
      // Nothing was paid — restore the consumed credits before throwing
      // (append-only reversal rows; redeemed rows are never edited)
      await reverseRedemption(payment.payee_id, redemption.payeeRedeemed, payment.id);
      await reverseRedemption(payment.payer_id, redemption.payerRedeemed, payment.id);
      // Money is sitting in escrow with the fundi unpaid — wake the founder.
      reportError('escrow.release.payout', new Error(`Fundi payout failed (status: ${payout.status})`), {
        paymentId: payment.id,
        jobId: payment.job_id,
        payeeId: payment.payee_id,
        fundiPayout,
        payeeMomoPhone: payment.payee_momo_phone ?? '(none on file)',
      });
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
      commission,
      guarantee_accrual: split.guaranteeAccrual,
      fundi_payout: fundiPayout,
      receipt_number: receiptNumber,
    })
    .eq('id', payment.id);
  if (error) throw error;

  // 4. Employer credit cashback — AFTER the release is committed so a
  // cashback failure can never cause a double payout on retry. Failure is
  // non-fatal: the employer's credit is restored (reversal row) and the
  // release stands.
  if (redemption.payerRedeemed > 0) {
    try {
      if (payment.payer_momo_phone) {
        const cashback = await provider.payout({
          phone: payment.payer_momo_phone,
          amountUgx: redemption.payerRedeemed,
          externalRef: `cashback_${payment.idempotency_key}`,
          narration: `Tukola referral credit cashback ${receiptNumber}`,
        });
        if (cashback.status !== 'successful') throw new Error(`status: ${cashback.status}`);
      }
    } catch (e) {
      console.warn(`[escrow] credit cashback failed for payment ${payment.id} — restoring employer credit:`, e);
      await reverseRedemption(payment.payer_id, redemption.payerRedeemed, payment.id);
    }
  }

  track('payment_released', payment.payer_id, {
    paymentId: payment.id,
    jobId: payment.job_id,
    amount: payment.amount,
    fundiPayout,
    commission,
    guaranteeAccrual: split.guaranteeAccrual,
    referralCreditRedeemed: redemption.payerRedeemed + redemption.payeeRedeemed,
    receiptNumber,
  });

  // Tell BOTH parties the money moved — fire-and-forget safe (skips
  // recipients with no email on file; never affects the release).
  await sendPaymentReleasedEmail({
    fundiId: payment.payee_id,
    employerId: payment.payer_id,
    jobId: payment.job_id,
    amountUgx: payment.amount,
    fundiPayoutUgx: fundiPayout,
  });

  // SMS the fundi — money has actually landed (or is queued). Fire-and-forget.
  notifyJobEvent(sb, payment.job_id, payment.payee_id, (title) =>
    payToWallet
      ? `Tukola: UGX ${Number(fundiPayout).toLocaleString()} for "${title}" is now in your Tukola wallet. Cash out to MoMo anytime. Receipt ${receiptNumber}.`
      : `Tukola: UGX ${Number(fundiPayout).toLocaleString()} for "${title}" has been sent to your Mobile Money${payment.payee_momo_phone ? ` ${payment.payee_momo_phone}` : ''}. Receipt ${receiptNumber}.`
  ).catch(() => {});

  return {
    receiptNumber,
    split: { commission, guaranteeAccrual: split.guaranteeAccrual, fundiPayout },
  };
}
