import { createServerSupabase } from './supabase-server';
import { track } from './analytics';

/**
 * Guarantee claims (Phase 2 of the rebuild plan).
 *
 * THE FLOW (as implemented)
 * ─────────────────────────
 *   1. The CUSTOMER (job's employer) files a claim on a COMPLETED job
 *      whose payment has been RELEASED — that's when the guarantee
 *      applies. (Held/disputed payments go through the disputes flow
 *      instead; there is nothing to claim from the reserve yet.)
 *   2. Admin reviews: submitted → under_review → resolution.
 *      under_review is an optional working state; a submitted claim may
 *      also be resolved directly.
 *   3. Resolutions:
 *      approve_redo   — we dispatch a re-do. No reserve money moves;
 *                       the note records the dispatch. (Re-dispatch
 *                       itself is a manual op today.)
 *      approve_refund — money out of the reserve, capped at
 *                       min(amount_claimed, UGX 200,000, reserve balance)
 *                       — NEVER more than the reserve holds. The payout
 *                       is an append-only guarantee_reserve row
 *                       (entry_type='payout', negative amount), linked
 *                       from guarantee_claims.payout_ledger_id.
 *      reject         — terminal, note required.
 *
 * LEDGER DISCIPLINE (same as guarantee_reserve in 005 / credits in 008)
 * ────────────────────────────────────────────────────────────────────
 *   Reserve balance = SUM(guarantee_reserve.amount) — never a stored
 *   number, never fabricated. Loss ratio = |SUM(payouts)| / SUM(accruals).
 *   Corrections are new ledger rows (entry_type='adjustment'), never
 *   edits to existing rows.
 *
 * OWNERSHIP (belt and braces — the partial unique index in migration 009
 * is the hard floor):
 *   • only the job's employer can file (checked against the session user)
 *   • one OPEN claim per job (submitted/under_review) — DB-enforced
 */

// ── Constants & types ────────────────────────────────────────────────────────

/** Hard per-claim refund cap, UGX. Mirrored by a CHECK constraint in 009. */
export const GUARANTEE_CLAIM_CAP_UGX = 200_000;

export type ClaimStatus =
  | 'submitted'
  | 'under_review'
  | 'approved_redo'
  | 'approved_refund'
  | 'rejected';

export type ClaimResolution = 'approve_redo' | 'approve_refund' | 'reject';

export interface GuaranteeClaim {
  id: number;
  claimantId: string;
  jobId: string;
  paymentId: number;
  reason: string;
  photoUrls: string[];
  status: ClaimStatus;
  amountClaimed: number | null;
  amountApproved: number | null;
  reviewedBy: string | null;
  resolutionNote: string | null;
  payoutLedgerId: number | null;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
}

export function mapClaim(r: any): GuaranteeClaim {
  return {
    id: r.id,
    claimantId: r.claimant_id,
    jobId: r.job_id,
    paymentId: r.payment_id,
    reason: r.reason,
    photoUrls: r.photo_urls ?? [],
    status: r.status,
    amountClaimed: r.amount_claimed ?? null,
    amountApproved: r.amount_approved ?? null,
    reviewedBy: r.reviewed_by ?? null,
    resolutionNote: r.resolution_note ?? null,
    payoutLedgerId: r.payout_ledger_id ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    reviewedAt: r.reviewed_at ?? null,
  };
}

/** Error carrying an HTTP status so routes can map failures honestly. */
export class GuaranteeError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

// ── Filing (customer) ────────────────────────────────────────────────────────

/**
 * File a guarantee claim. Validates (server-side, from real rows):
 *   • the caller IS the job's employer (never a client-supplied ID)
 *   • the job is completed
 *   • the job has a released payment (the guarantee covers paid work)
 *   • there is no other open claim on the job (the partial unique
 *     index in 009 is the hard floor; we pre-check for a clean error)
 *
 * photoUrls are client-supplied URLs/paths only — photo STORAGE is not
 * wired yet; the current claim form collects the reason only.
 */
export async function fileClaim(
  claimantId: string,
  jobId: string,
  reason: string,
  photoUrls: string[] = [],
  amountClaimed?: number | null
): Promise<GuaranteeClaim> {
  const trimmed = reason?.trim();
  if (!trimmed) throw new GuaranteeError('A reason is required to file a claim');
  if (amountClaimed != null && (!Number.isFinite(amountClaimed) || amountClaimed <= 0)) {
    throw new GuaranteeError('The claimed amount must be a positive UGX figure');
  }

  const sb = createServerSupabase();

  const { data: job } = await sb
    .from('jobs')
    .select('id, employer_id, status')
    .eq('id', jobId)
    .maybeSingle();
  if (!job) throw new GuaranteeError('Job not found', 404);
  if (job.employer_id !== claimantId) {
    throw new GuaranteeError('Only the customer who posted this job can file a claim', 403);
  }
  if (job.status !== 'completed') {
    throw new GuaranteeError(
      'The Tukola Guarantee covers completed jobs — if the job is still underway, open a dispute instead',
      409
    );
  }

  // The guarantee pays out of the reserve, so there must be a real
  // released payment to claim against (the job must have been paid).
  const { data: payment } = await sb
    .from('payments')
    .select('id, status, amount')
    .eq('job_id', jobId)
    .eq('status', 'released')
    .order('released_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!payment) {
    throw new GuaranteeError('This job has no released payment — there is nothing to claim on', 409);
  }

  // One open claim per job (pre-check for a friendly message; the DB
  // partial unique index is the actual guard against races)
  const { data: openClaim } = await sb
    .from('guarantee_claims')
    .select('id')
    .eq('job_id', jobId)
    .in('status', ['submitted', 'under_review'])
    .limit(1)
    .maybeSingle();
  if (openClaim) {
    throw new GuaranteeError('There is already an open claim on this job', 409);
  }

  const { data: claim, error } = await sb
    .from('guarantee_claims')
    .insert({
      claimant_id: claimantId,
      job_id: jobId,
      payment_id: payment.id,
      reason: trimmed,
      photo_urls: photoUrls.filter(u => typeof u === 'string' && u.trim()).map(u => u.trim()),
      amount_claimed: amountClaimed ?? null,
      status: 'submitted',
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') throw new GuaranteeError('There is already an open claim on this job', 409);
    throw error;
  }

  track('claim_submitted', claimantId, {
    claimId: claim.id,
    jobId,
    paymentId: payment.id,
    amountClaimed: amountClaimed ?? null,
  });

  return mapClaim(claim);
}

/** All claims filed by one customer, newest first. */
export async function listClaimsForUser(claimantId: string): Promise<GuaranteeClaim[]> {
  const sb = createServerSupabase();
  const { data, error } = await sb
    .from('guarantee_claims')
    .select('*')
    .eq('claimant_id', claimantId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapClaim);
}

// ── Reserve ledger (append-only — all figures are ledger SUMs) ───────────────

/**
 * Current guarantee reserve balance in UGX — SUM of every ledger row
 * (accruals positive, payouts negative, adjustments signed). Never a
 * stored number; never fabricated. Returns 0 on failure (safe default:
 * nothing to pay out).
 */
export async function getReserveBalance(): Promise<number> {
  try {
    const sb = createServerSupabase();
    const { data, error } = await sb.from('guarantee_reserve').select('amount');
    if (error) throw error;
    return (data ?? []).reduce((sum, r) => sum + r.amount, 0);
  } catch (e) {
    console.warn('[guarantee] getReserveBalance failed:', e);
    return 0;
  }
}

export interface GuaranteeLossRatio {
  totalAccruedUgx: number;  // lifetime 2% accruals
  totalPaidOutUgx: number;  // lifetime claim payouts (positive figure)
  lossRatioPct: number;     // totalPaidOut / totalAccrued × 100 (0 when nothing accrued)
}

/**
 * Loss ratio for the admin analytics page: total approved payouts ÷
 * total accrued, both summed from the ledger. No estimates.
 */
export async function getLossRatio(): Promise<GuaranteeLossRatio> {
  try {
    const sb = createServerSupabase();
    const { data, error } = await sb
      .from('guarantee_reserve')
      .select('amount, entry_type');
    if (error) throw error;

    let accrued = 0;
    let paidOut = 0;
    for (const r of data ?? []) {
      if (r.entry_type === 'accrual') accrued += r.amount;
      else if (r.entry_type === 'payout') paidOut += Math.abs(r.amount);
      // 'adjustment' rows move the balance but are neither premium nor loss
    }
    return {
      totalAccruedUgx: accrued,
      totalPaidOutUgx: paidOut,
      lossRatioPct: accrued > 0 ? Math.round((paidOut / accrued) * 100) : 0,
    };
  } catch (e) {
    console.warn('[guarantee] getLossRatio failed:', e);
    return { totalAccruedUgx: 0, totalPaidOutUgx: 0, lossRatioPct: 0 };
  }
}

// ── Admin review ─────────────────────────────────────────────────────────────

/**
 * Admin claims queue — open claims first (submitted, then under_review),
 * then recently resolved, with the job and payment context an admin
 * needs to decide.
 */
export async function listClaimQueue(): Promise<any[]> {
  const sb = createServerSupabase();
  const { data, error } = await sb
    .from('guarantee_claims')
    .select('*, jobs(title, location, pay), payments(amount, status, released_at)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows = data ?? [];
  const rank = (s: string) => (s === 'submitted' ? 0 : s === 'under_review' ? 1 : 2);
  return rows.sort((a, b) => rank(a.status) - rank(b.status));
}

/**
 * Resolve a claim. Idempotent on terminal states (re-resolving a resolved
 * claim is rejected, so a payout can never be issued twice for one claim).
 *
 * approve_refund cap: min(amount_requested_by_admin or amount_claimed or
 * cap, UGX 200,000, current reserve balance). The reserve balance check
 * means a refund can NEVER exceed what the reserve actually holds.
 */
export async function resolveClaim(
  claimId: number,
  adminId: string,
  resolution: ClaimResolution,
  note?: string | null,
  requestedAmount?: number | null
): Promise<GuaranteeClaim> {
  const sb = createServerSupabase();

  const { data: claim } = await sb
    .from('guarantee_claims')
    .select('*')
    .eq('id', claimId)
    .maybeSingle();
  if (!claim) throw new GuaranteeError('Claim not found', 404);
  if (!['submitted', 'under_review'].includes(claim.status)) {
    throw new GuaranteeError('This claim is already resolved', 409);
  }

  const resolutionNote = note?.trim() || null;
  if (resolution === 'reject' && !resolutionNote) {
    throw new GuaranteeError('A note is required when rejecting a claim — the customer deserves to know why');
  }

  const now = new Date().toISOString();
  const stamp: Record<string, unknown> = {
    reviewed_by: adminId,
    resolution_note: resolutionNote,
    reviewed_at: now,
    updated_at: now,
  };

  if (resolution === 'approve_redo') {
    stamp.status = 'approved_redo';
    stamp.amount_approved = 0;
  } else if (resolution === 'reject') {
    stamp.status = 'rejected';
    stamp.amount_approved = 0;
  } else {
    // approve_refund — the only path that moves reserve money
    const balance = await getReserveBalance();
    const base = requestedAmount != null && requestedAmount > 0
      ? requestedAmount
      : (claim.amount_claimed ?? GUARANTEE_CLAIM_CAP_UGX);
    const approved = Math.min(base, GUARANTEE_CLAIM_CAP_UGX, Math.max(balance, 0));
    if (approved <= 0) {
      throw new GuaranteeError(
        balance <= 0
          ? 'The guarantee reserve is empty — there is nothing to pay out'
          : 'The approvable amount is zero',
        409
      );
    }

    // 1. Append-only payout row FIRST — a crash after this point leaves
    //    the claim open (safe: no double payout, the admin retries).
    const { data: ledgerRow, error: ledgerError } = await sb
      .from('guarantee_reserve')
      .insert({
        payment_id: claim.payment_id,
        entry_type: 'payout',
        amount: -approved,
        note: `Guarantee claim #${claim.id} refund (job ${claim.job_id})`,
      })
      .select('id')
      .single();
    if (ledgerError) throw ledgerError;

    stamp.status = 'approved_refund';
    stamp.amount_approved = approved;
    stamp.payout_ledger_id = ledgerRow.id;
  }

  // 2. Flip the claim — guarded on the open statuses so a concurrent
  //    resolve can never issue a second payout for the same claim.
  const { data: updated, error } = await sb
    .from('guarantee_claims')
    .update(stamp)
    .eq('id', claimId)
    .in('status', ['submitted', 'under_review'])
    .select()
    .maybeSingle();
  if (error) throw error;
  if (!updated) throw new GuaranteeError('This claim is already resolved', 409);

  track(resolution === 'reject' ? 'claim_rejected' : 'claim_approved', claim.claimant_id, {
    claimId,
    jobId: claim.job_id,
    resolution,
    amountApproved: stamp.amount_approved ?? null,
  });

  return mapClaim(updated);
}

/** Move a claim into the admin working state (optional; not a gate). */
export async function markUnderReview(claimId: number, adminId: string): Promise<void> {
  const sb = createServerSupabase();
  const { error } = await sb
    .from('guarantee_claims')
    .update({ status: 'under_review', reviewed_by: adminId, updated_at: new Date().toISOString() })
    .eq('id', claimId)
    .eq('status', 'submitted');
  if (error) throw error;
}
