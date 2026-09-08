import { createServerSupabase } from './supabase-server';

/**
 * Reliability score v1 (Phase 2 of the rebuild plan).
 *
 * A per-fundi computed trust field from REAL rows only — no ML, no
 * fabricated defaults. Stored on profiles.reliability_score:
 *
 *   NULL  → no track record → the UI shows "New" (never a fake score)
 *   0–100 → computed value
 *
 * THE FORMULA (simple weighted arithmetic)
 * ─────────────────────────────────────────
 *   score = 50                                            // everyone starts at neutral
 *     + min(30, 4 × recent completions + 2 × older completions)
 *     − 15 × recent disputes lost − 8 × older disputes lost
 *     −  8 × recent no-shows      − 4 × older no-shows
 *   clamped to [0, 100]
 *
 *   "recent" = the event happened within the last 90 days; older events
 *   count at half weight so current behaviour matters more than history.
 *
 * SIGNALS (all derived from existing rows — nothing is self-reported)
 * ──────────────────────────────────────────────────────────────────
 *   completion   : the fundi's application was accepted AND the job
 *                  reached status 'completed' (jobs.completed_at).
 *   dispute lost : a dispute on a payment where the fundi was the payee
 *                  was resolved 'resolved_refund' — an admin sent the
 *                  escrow back to the employer (disputes.resolved_at).
 *   no-show      : the fundi's application was accepted but the job
 *                  ended 'cancelled' without ever completing. NOTE:
 *                  cancellations are employer-initiated, so this is a
 *                  "collapsed booking" proxy — a booking that dies after
 *                  acceptance is a reliability miss more often than not.
 *                  Weighted lower than a lost dispute for that reason.
 *
 *   late arrivals: NOT computable in v1 — the schema has no arrival /
 *                  start timestamp (only worker_done_at). When a real
 *                  arrival signal exists, add a "− 5 × late arrivals"
 *                  term here. Until then the score honestly omits it.
 *
 * A fundi with ZERO events across all three signals keeps NULL — the
 * marketplace must not dress up the absence of data as a number.
 *
 * Called (non-fatally) from every API route where one of the underlying
 * signals changes: job completion, escrow auto-release, dispute
 * resolution, and job cancellation after acceptance.
 */

const RECENT_WINDOW_DAYS = 90;

// Weights (see formula above)
const COMPLETION_RECENT = 4;
const COMPLETION_OLDER = 2;
const COMPLETION_CAP = 30;        // total positive contribution cap
const DISPUTE_LOST_RECENT = 15;
const DISPUTE_LOST_OLDER = 8;
const NO_SHOW_RECENT = 8;
const NO_SHOW_OLDER = 4;

const BASE_SCORE = 50;

export interface ReliabilityBreakdown {
  completionsRecent: number;
  completionsOlder: number;
  disputesLostRecent: number;
  disputesLostOlder: number;
  noShowsRecent: number;
  noShowsOlder: number;
}

function isRecent(iso: string | null | undefined, cutoffMs: number): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) && t >= cutoffMs;
}

/**
 * Recompute and persist a fundi's reliability score.
 *
 * Returns the score written (null when the fundi has no history and the
 * column was set back to NULL). Never throws — a scoring failure must
 * not break the user action that triggered it; it logs and returns the
 * previous/unknown state as undefined.
 */
export async function recomputeReliabilityScore(
  fundiId: string
): Promise<number | null | undefined> {
  try {
    const sb = createServerSupabase();
    const cutoffMs = Date.now() - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000;

    // ── Signal 1 + 3: this fundi's accepted applications and their job outcomes
    const { data: accepted, error: appError } = await sb
      .from('applications')
      .select('job_id, jobs!inner(status, created_at, completed_at)')
      .eq('worker_id', fundiId)
      .eq('status', 'accepted');
    if (appError) throw appError;

    const b: ReliabilityBreakdown = {
      completionsRecent: 0,
      completionsOlder: 0,
      disputesLostRecent: 0,
      disputesLostOlder: 0,
      noShowsRecent: 0,
      noShowsOlder: 0,
    };

    for (const row of accepted ?? []) {
      const job = (row as any).jobs;
      if (!job) continue;
      if (job.status === 'completed') {
        // Recency is measured by when the job finished, falling back to
        // the job's creation date for legacy rows without completed_at.
        const when = job.completed_at ?? job.created_at;
        if (isRecent(when, cutoffMs)) b.completionsRecent++;
        else b.completionsOlder++;
      } else if (job.status === 'cancelled') {
        // No cancelled_at column — jobs are short-lived, so created_at
        // is the recency proxy.
        if (isRecent(job.created_at, cutoffMs)) b.noShowsRecent++;
        else b.noShowsOlder++;
      }
    }

    // ── Signal 2: disputes this fundi lost (escrow refunded to employer)
    const { data: lostDisputes, error: dispError } = await sb
      .from('disputes')
      .select('resolved_at, payments!inner(payee_id)')
      .eq('status', 'resolved_refund')
      .eq('payments.payee_id', fundiId);
    if (dispError) throw dispError;

    for (const d of lostDisputes ?? []) {
      if (isRecent(d.resolved_at, cutoffMs)) b.disputesLostRecent++;
      else b.disputesLostOlder++;
    }

    // ── No history → NULL ("New" in the UI), never a fabricated number
    const totalEvents =
      b.completionsRecent + b.completionsOlder +
      b.disputesLostRecent + b.disputesLostOlder +
      b.noShowsRecent + b.noShowsOlder;

    if (totalEvents === 0) {
      const { error } = await sb
        .from('profiles')
        .update({ reliability_score: null })
        .eq('id', fundiId);
      if (error) throw error;
      return null;
    }

    const positive = Math.min(
      COMPLETION_CAP,
      COMPLETION_RECENT * b.completionsRecent + COMPLETION_OLDER * b.completionsOlder
    );
    const negative =
      DISPUTE_LOST_RECENT * b.disputesLostRecent + DISPUTE_LOST_OLDER * b.disputesLostOlder +
      NO_SHOW_RECENT * b.noShowsRecent + NO_SHOW_OLDER * b.noShowsOlder;

    const score = Math.max(0, Math.min(100, BASE_SCORE + positive - negative));

    const { error: updateError } = await sb
      .from('profiles')
      .update({ reliability_score: score })
      .eq('id', fundiId);
    if (updateError) throw updateError;

    return score;
  } catch (e) {
    // Non-fatal by design: reliability scoring must never break a
    // completion, release, dispute, or cancellation.
    console.warn(`[reliability] recompute failed for ${fundiId}:`, e);
    return undefined;
  }
}
