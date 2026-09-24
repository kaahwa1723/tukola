import { randomInt } from 'node:crypto';
import { createServerSupabase } from './supabase-server';
import { track } from './analytics';

/**
 * Referral mechanics (Phase 2 of the rebuild plan; v2 rules per founder
 * decision 24 Sep 2026 — amounts in UGX).
 *
 * THE RULES (as implemented)
 * ──────────────────────────
 *   Customer referral (referee signs up as an EMPLOYER):
 *     the referred customer gets UGX 10,000 of WELCOME CREDIT AT SIGNUP
 *     (so "UGX 10,000 off your first job" is literally true); the
 *     REFERRER earns UGX 10,000 when the referred customer's FIRST paid
 *     job completes (escrow released) — paying the referrer only on a
 *     completed paid job keeps fake signups from minting credit.
 *   Fundi referral (referee signs up as a WORKER):
 *     on the referred fundi's first completed paid job, the REFERRER
 *     earns UGX 10,000 and the REFERRED FUNDI earns UGX 5,000.
 *
 *   CREDITS NEVER LEAVE THE APP (hard rule, 24 Sep 2026):
 *     • Customer credit is a DISCOUNT AT FUNDING TIME — the employer's
 *       MoMo charge / wallet debit is reduced (see applyFundingCredit()
 *       and app/api/payments/route.ts). The discount is capped at
 *       commission − guarantee accrual so a discounted job can never
 *       dip into the guarantee reserve or go negative for the platform.
 *     • Fundi credit reduces the platform commission at escrow release
 *       and is added to the fundi's job payout (redeemCreditsForRelease).
 *     • There is NO cashback path. A refund returns only what was
 *       actually paid (amount − discount) and restores the credit —
 *       otherwise refunds would mint money.
 *
 *   Credits are ledger rows (referral_credits), never stored counters:
 *     balance = SUM(earned) − SUM(redeemed) − SUM(expired)
 *
 * SAFETY INVARIANTS
 * ─────────────────
 *   • UNIQUE(referrals.referee_id)  → a signup is attributed once, ever
 *   • CHECK (referrer_id <> referee_id) → self-referral is impossible
 *   • status pending → rewarded (terminal) → a referral pays out once
 *   • "first paid job" = the user has exactly ONE released payment as
 *     payer (customer) / payee (fundi) at reward time — derived from
 *     real payment rows, never from a flag the client can set
 *   • every public function here is NON-FATAL: referral mechanics must
 *     never break signup, completion, or money movement. Failures log
 *     and return a safe empty value.
 */

// ── Amounts (UGX) ────────────────────────────────────────────────────────────
export const CUSTOMER_REFERRAL_CREDIT_UGX = 10_000; // both sides
export const FUNDI_REFERRER_CREDIT_UGX = 10_000;    // referrer on first paid job (founder, 24 Sep 2026)
export const FUNDI_REFEREE_CREDIT_UGX = 5_000;      // referred fundi welcome credit

// ── Codes ────────────────────────────────────────────────────────────────────
// 8 chars from an unambiguous alphabet (no 0/O/1/I/L) — readable aloud.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;

function generateCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

/**
 * Get (or lazily mint) a user's referral code. One per user, enforced by
 * the PK on referral_codes.user_id; concurrent mints lose the unique race
 * and read back the winner's code. Returns null on failure (non-fatal).
 */
export async function getOrCreateReferralCode(userId: string): Promise<string | null> {
  try {
    const sb = createServerSupabase();

    const { data: existing } = await sb
      .from('referral_codes')
      .select('code')
      .eq('user_id', userId)
      .maybeSingle();
    if (existing?.code) return existing.code;

    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateCode();
      const { error } = await sb
        .from('referral_codes')
        .insert({ user_id: userId, code });
      if (!error) return code;
      if (error.code === '23505') {
        // Either the code collided (retry) or the user row raced us
        // (read back the winner)
        const { data: raced } = await sb
          .from('referral_codes')
          .select('code')
          .eq('user_id', userId)
          .maybeSingle();
        if (raced?.code) return raced.code;
        continue;
      }
      throw error;
    }
    throw new Error('could not mint a unique referral code after 5 attempts');
  } catch (e) {
    console.warn(`[referrals] getOrCreateReferralCode failed for ${userId}:`, e);
    return null;
  }
}

/**
 * Attribute a new signup to a referral code.
 *
 * Called (non-fatally) from /api/auth/register after a NEW profile is
 * created — never for resumed accounts. The code comes from the client
 * (?ref= → localStorage → register body); it is only ever used to LOOK UP
 * the referrer, never to identify the new user.
 *
 * Invalid/unknown codes, self-referrals and repeat attributions are
 * silently ignored — a bad code must not fail a signup.
 */
export async function attributeSignup(
  refereeId: string,
  rawCode: string | null | undefined,
  refereeRole: 'worker' | 'employer'
): Promise<boolean> {
  try {
    const code = rawCode?.trim().toUpperCase();
    if (!code) return false;

    const sb = createServerSupabase();
    const { data: owner } = await sb
      .from('referral_codes')
      .select('user_id')
      .eq('code', code)
      .maybeSingle();

    if (!owner || owner.user_id === refereeId) return false; // unknown code / self-referral

    const { data: inserted, error } = await sb.from('referrals').insert({
      referrer_id: owner.user_id,
      referee_id: refereeId,
      referee_role: refereeRole,
      code,
      status: 'pending',
    }).select('id').single();

    if (error) {
      // 23505 = already attributed (resume race) — treat as success-neutral
      if (error.code !== '23505') throw error;
      return false;
    }

    // Customer referrals: the welcome credit lands AT SIGNUP so the new
    // customer's first job is genuinely discounted at funding time. The
    // referrer's side still waits for the referee's first completed paid
    // job (fake signups never pay the referrer). Fundi welcome credit is
    // paid with the referrer reward at first completed paid job instead —
    // a fundi has no funding step to discount.
    if (refereeRole === 'employer') {
      try {
        await issueCredit(refereeId, CUSTOMER_REFERRAL_CREDIT_UGX, inserted.id,
          'Referral welcome credit — UGX 10,000 off your first job');
      } catch (e) {
        console.warn(`[referrals] welcome credit failed for ${refereeId}:`, e);
      }
    }

    track('referral_attributed', refereeId, {
      role: refereeRole,
      referrerId: owner.user_id,
    });
    return true;
  } catch (e) {
    console.warn(`[referrals] attributeSignup failed for ${refereeId}:`, e);
    return false;
  }
}

// ── Credit ledger ────────────────────────────────────────────────────────────

/**
 * A user's available credit balance in UGX, computed from the ledger.
 * NEVER a stored number. Returns 0 on failure (safe default: no credit).
 */
export async function getCreditBalance(userId: string): Promise<number> {
  try {
    const sb = createServerSupabase();
    const { data, error } = await sb
      .from('referral_credits')
      .select('amount_ugx, kind')
      .eq('user_id', userId);
    if (error) throw error;

    let balance = 0;
    for (const row of data ?? []) {
      if (row.kind === 'earned') balance += row.amount_ugx;
      else balance -= row.amount_ugx; // redeemed | expired
    }
    return Math.max(0, balance);
  } catch (e) {
    console.warn(`[referrals] getCreditBalance failed for ${userId}:`, e);
    return 0;
  }
}

/** Count of completed (rewarded) + pending referrals made by a user. */
export async function getReferralCount(userId: string): Promise<number> {
  try {
    const sb = createServerSupabase();
    const { count, error } = await sb
      .from('referrals')
      .select('id', { count: 'exact', head: true })
      .eq('referrer_id', userId);
    if (error) throw error;
    return count ?? 0;
  } catch (e) {
    console.warn(`[referrals] getReferralCount failed for ${userId}:`, e);
    return 0;
  }
}

async function issueCredit(
  userId: string,
  amountUgx: number,
  referralId: number,
  note: string
): Promise<void> {
  const sb = createServerSupabase();
  const { error } = await sb.from('referral_credits').insert({
    user_id: userId,
    amount_ugx: amountUgx,
    kind: 'earned',
    referral_id: referralId,
    note,
  });
  if (error) throw error;
  track('referral_credit_issued', userId, { amountUgx, referralId });
}

/**
 * Reward a pending referral whose referee just hit the qualifying event.
 * Idempotent: only rows still 'pending' are paid, and the status flip
 * (guarded .eq('status','pending')) means concurrent calls pay once.
 */
async function rewardPendingReferral(refereeId: string, refereeRole: 'worker' | 'employer'): Promise<void> {
  const sb = createServerSupabase();
  const { data: referral } = await sb
    .from('referrals')
    .select('id, referrer_id')
    .eq('referee_id', refereeId)
    .eq('status', 'pending')
    .maybeSingle();
  if (!referral) return; // nobody referred them, or already rewarded

  if (refereeRole === 'employer') {
    // Customer referral: UGX 10K to the REFERRER only — the referee's
    // 10K welcome credit was already issued at signup (attributeSignup).
    await issueCredit(referral.referrer_id, CUSTOMER_REFERRAL_CREDIT_UGX, referral.id,
      'Customer referral — referred customer completed their first paid job');
  } else {
    // Fundi referral: UGX 10K to the referrer + UGX 5K welcome credit to the fundi
    await issueCredit(referral.referrer_id, FUNDI_REFERRER_CREDIT_UGX, referral.id,
      'Fundi referral — referred fundi completed their first paid job');
    await issueCredit(refereeId, FUNDI_REFEREE_CREDIT_UGX, referral.id,
      'Referral welcome credit — your first paid job completed');
  }

  // Terminal flip; if a concurrent call already flipped it, the row is
  // still rewarded — harmless (credits above were issued by the winner
  // only because only one caller sees status='pending' → flips first is
  // best-effort; UNIQUE(referee_id) keeps attribution single regardless).
  await sb
    .from('referrals')
    .update({ status: 'rewarded', rewarded_at: new Date().toISOString() })
    .eq('id', referral.id)
    .eq('status', 'pending');
}

/**
 * THE completion hook — call after a job is completed AND its escrow is
 * released (confirm-release route and the 48h auto-release cron).
 *
 * Fires referral rewards when this completion is the referee's FIRST
 * released payment on their side of the marketplace:
 *   employer side (payer)  → customer referral rules
 *   fundi side (payee)     → fundi referral rules
 *
 * "First" is derived from real payment rows (exactly one 'released'
 * payment for that user), so retries and idempotent read-backs cannot
 * double-pay. Never throws.
 */
export async function issueReferralCreditsForCompletion(jobId: string): Promise<void> {
  try {
    const sb = createServerSupabase();

    const { data: job } = await sb
      .from('jobs')
      .select('id, employer_id, status')
      .eq('id', jobId)
      .maybeSingle();
    if (!job || job.status !== 'completed') return;

    // Only paid jobs qualify: this job must have a released payment
    const { data: payment } = await sb
      .from('payments')
      .select('id')
      .eq('job_id', jobId)
      .eq('status', 'released')
      .limit(1)
      .maybeSingle();
    if (!payment) return;

    // ── Customer referral: is this the employer's first released payment as payer?
    const { count: payerCount } = await sb
      .from('payments')
      .select('id', { count: 'exact', head: true })
      .eq('payer_id', job.employer_id)
      .eq('status', 'released');
    if (payerCount === 1) {
      await rewardPendingReferral(job.employer_id, 'employer');
    }

    // ── Fundi referral: is this the worker's first released payment as payee?
    const { data: accepted } = await sb
      .from('applications')
      .select('worker_id')
      .eq('job_id', jobId)
      .eq('status', 'accepted')
      .limit(1);
    const workerId = accepted?.[0]?.worker_id;
    if (workerId) {
      const { count: payeeCount } = await sb
        .from('payments')
        .select('id', { count: 'exact', head: true })
        .eq('payee_id', workerId)
        .eq('status', 'released');
      if (payeeCount === 1) {
        await rewardPendingReferral(workerId, 'worker');
      }
    }
  } catch (e) {
    // Non-fatal by design: referrals never break a completion/release
    console.warn(`[referrals] issueReferralCreditsForCompletion failed for job ${jobId}:`, e);
  }
}

// ── Redemption (in-app only — credit NEVER becomes cash) ─────────────────────

/**
 * Consume a FUNDI's referral credit against the platform commission at
 * escrow release: the credit reduces the commission and is added to the
 * fundi's payout — one disbursement, just bigger, on a real completed job.
 *
 * CAPPED at the commission: credit can zero the platform's take but can
 * never make a payment leg negative. The 2% guarantee accrual is
 * unchanged — it is computed from GMV, not from the post-credit commission.
 *
 * Customer (payer) credit is NOT redeemed here — it is a discount at
 * funding time (applyFundingCredit). There is no cashback path.
 *
 * Ledger discipline: the 'redeemed' row is inserted BEFORE the payout
 * (a crash after payout without a redeemed row would let the user
 * double-spend). If the payout fails, the caller reverses via
 * reverseRedemption() — corrections are new rows, never edits.
 */
export async function redeemCreditsForRelease(
  paymentId: number,
  payeeId: string,
  commission: number
): Promise<number> {
  try {
    if (commission <= 0) return 0;
    const payeeBalance = await getCreditBalance(payeeId);
    const payeeRedeemed = Math.min(payeeBalance, commission);
    if (payeeRedeemed === 0) return 0;

    const sb = createServerSupabase();
    const { error } = await sb.from('referral_credits').insert({
      user_id: payeeId, amount_ugx: payeeRedeemed, kind: 'redeemed',
      payment_id: paymentId,
      note: `Redeemed against commission on payment #${paymentId} (added to payout)`,
    });
    if (error) throw error;

    return payeeRedeemed;
  } catch (e) {
    // Redemption failure must not block a release — commission stands
    console.warn(`[referrals] redeemCreditsForRelease failed for payment ${paymentId}:`, e);
    return 0;
  }
}

/**
 * Consume a CUSTOMER's referral credit as a funding-time discount.
 * Called from POST /api/payments AFTER the escrow row exists and BEFORE
 * the employer is charged: the MoMo debit / wallet debit is reduced by
 * the returned amount. The escrowed amount stays the full job price —
 * the platform absorbs the discount from its commission at release.
 *
 * The CALLER caps maxDiscountUgx at commission − guarantee accrual (it
 * owns the split math — this module must not import lib/escrow.ts), so
 * a discounted job can never dip into the guarantee reserve.
 *
 * If the funding later fails or the payment is refunded, the caller
 * restores the credit via restoreFundingCredit(). Non-fatal: a failure
 * here returns 0 (full price charged, credit intact).
 */
export async function applyFundingCredit(
  paymentId: number,
  payerId: string,
  maxDiscountUgx: number
): Promise<number> {
  try {
    if (maxDiscountUgx <= 0) return 0;
    const balance = await getCreditBalance(payerId);
    const discount = Math.min(balance, maxDiscountUgx);
    if (discount <= 0) return 0;

    const sb = createServerSupabase();
    const { error } = await sb.from('referral_credits').insert({
      user_id: payerId, amount_ugx: discount, kind: 'redeemed',
      payment_id: paymentId,
      note: `Redeemed as a discount on job funding (payment #${paymentId})`,
    });
    if (error) throw error;

    track('referral_credit_redeemed', payerId, { amountUgx: discount, paymentId, via: 'funding_discount' });
    return discount;
  } catch (e) {
    console.warn(`[referrals] applyFundingCredit failed for payment ${paymentId}:`, e);
    return 0;
  }
}

/** Sum of a user's 'redeemed' ledger rows against one payment. */
async function getPaymentRedeemedCredit(paymentId: number, userId: string): Promise<number> {
  const sb = createServerSupabase();
  const { data, error } = await sb
    .from('referral_credits')
    .select('amount_ugx')
    .eq('payment_id', paymentId)
    .eq('user_id', userId)
    .eq('kind', 'redeemed');
  if (error) throw error;
  return (data ?? []).reduce((sum, row) => sum + row.amount_ugx, 0);
}

/**
 * Exported for lib/escrow.ts refund math: how much of this payment was
 * covered by the payer's funding discount (0 if none / on error). A
 * refund must return only amount − discount and restore the credit —
 * refunding the full escrowed amount after a discount would mint money.
 */
export async function getFundingDiscount(paymentId: number, payerId: string): Promise<number> {
  try {
    return await getPaymentRedeemedCredit(paymentId, payerId);
  } catch (e) {
    console.warn(`[referrals] getFundingDiscount failed for payment ${paymentId}:`, e);
    return 0; // safe default: assume no discount (never short a refund silently)
  }
}

/**
 * Restore a funding discount after the funding failed or the payment was
 * refunded — an 'earned' reversal row referencing the same payment.
 * Idempotent: if a funding reversal row already exists for this payment,
 * this is a no-op (safe retries from refund/decline paths). Append-only:
 * the original 'redeemed' row is never edited.
 */
export async function restoreFundingCredit(paymentId: number, payerId: string): Promise<void> {
  try {
    const redeemed = await getPaymentRedeemedCredit(paymentId, payerId);
    if (redeemed <= 0) return;

    const sb = createServerSupabase();
    const reversalNote = `Reversal — job funding #${paymentId} did not complete, credit restored`;
    const { data: existing } = await sb
      .from('referral_credits')
      .select('id')
      .eq('payment_id', paymentId)
      .eq('user_id', payerId)
      .eq('kind', 'earned')
      .like('note', 'Reversal — job funding%')
      .limit(1);
    if (existing && existing.length > 0) return; // already restored

    await sb.from('referral_credits').insert({
      user_id: payerId,
      amount_ugx: redeemed,
      kind: 'earned',
      payment_id: paymentId,
      note: reversalNote,
    });
  } catch (e) {
    console.warn(`[referrals] restoreFundingCredit failed for payment ${paymentId}:`, e);
  }
}

/**
 * Restore a balance after a downstream payout failure — an 'earned'
 * reversal row referencing the same payment. Append-only: the original
 * 'redeemed' row is never edited.
 */
export async function reverseRedemption(
  userId: string,
  amountUgx: number,
  paymentId: number
): Promise<void> {
  try {
    if (amountUgx <= 0) return;
    const sb = createServerSupabase();
    await sb.from('referral_credits').insert({
      user_id: userId,
      amount_ugx: amountUgx,
      kind: 'earned',
      payment_id: paymentId,
      note: `Reversal — payout failed on payment #${paymentId}, credit restored`,
    });
  } catch (e) {
    console.warn(`[referrals] reverseRedemption failed for ${userId}:`, e);
  }
}
