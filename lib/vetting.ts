/**
 * vetting.ts — the Verified+ vetting queue (server-only).
 *
 * Two trust tiers (founder direction, 24 Sep 2026):
 *   is_verified   — ID-verified: admin confirmed the national ID. A quick
 *                   toggle on the user (Documents / Users pages).
 *   verified_plus — Verified+: full vetting. Conferred ONLY here, by a
 *                   review with ALL five checks passed:
 *                     1. national ID checked
 *                     2. LC1 / area letter checked
 *                     3. trade certificate checked (DIT/UVTAB/UBTEB)
 *                     4. certificate verified with the ISSUER
 *                     5. police clearance checked
 *
 * Every review action is appended to vetting_reviews (audit trail);
 * profiles.verified_plus mirrors the current state. Rejection clears the
 * badge. The fundi is SMS-notified on a decision — notification failure
 * is never fatal to the review itself.
 */

import { createServerSupabase } from './supabase-server';
import { notifyUser } from './notify';

export interface VettingChecks {
  idOk: boolean;
  lcLetterOk: boolean;
  certificateOk: boolean;
  issuerCheckOk: boolean;
  policeClearanceOk: boolean;
}

export type VettingDecision = 'in_review' | 'approve' | 'reject';

export const VETTING_CHECK_LABELS: Record<keyof VettingChecks, string> = {
  idOk: 'National ID checked',
  lcLetterOk: 'LC1 / area letter checked',
  certificateOk: 'Trade certificate checked',
  issuerCheckOk: 'Certificate verified with issuer',
  policeClearanceOk: 'Police clearance checked',
};

export function allChecksPassed(c: VettingChecks): boolean {
  return c.idOk && c.lcLetterOk && c.certificateOk && c.issuerCheckOk && c.policeClearanceOk;
}

/**
 * Record one review action on a fundi and apply its outcome.
 * Returns { status } on success, { error } on a validation failure.
 */
export async function submitVettingReview(opts: {
  fundiId: string;
  checks: VettingChecks;
  decision: VettingDecision;
  notes?: string;
  reviewedBy?: string;
}): Promise<{ status: 'in_review' | 'approved' | 'rejected' } | { error: string }> {
  const { fundiId, checks, decision, notes, reviewedBy } = opts;
  const sb = createServerSupabase();

  // The target must be a real worker account.
  const { data: fundi, error: fundiErr } = await sb
    .from('profiles')
    .select('id, role, name')
    .eq('id', fundiId)
    .maybeSingle();
  if (fundiErr) throw fundiErr;
  if (!fundi || fundi.role !== 'worker') {
    return { error: 'Fundi not found.' };
  }

  // Approve is all-or-nothing: every check must have passed. This is the
  // single path to Verified+ — there is no badge without the full checklist.
  if (decision === 'approve' && !allChecksPassed(checks)) {
    return { error: 'All five checks must pass before a fundi can be approved for Verified+.' };
  }

  const status = decision === 'approve' ? 'approved' : decision === 'reject' ? 'rejected' : 'in_review';
  const isDecision = status === 'approved' || status === 'rejected';

  const { error: insertErr } = await sb.from('vetting_reviews').insert({
    fundi_id: fundiId,
    status,
    id_ok: checks.idOk,
    lc_letter_ok: checks.lcLetterOk,
    certificate_ok: checks.certificateOk,
    issuer_check_ok: checks.issuerCheckOk,
    police_clearance_ok: checks.policeClearanceOk,
    notes: notes?.trim() || null,
    reviewed_by: reviewedBy ?? 'admin',
    reviewed_at: isDecision ? new Date().toISOString() : null,
  });
  if (insertErr) throw insertErr;

  // Mirror the decision onto the profile badge.
  if (status === 'approved') {
    const { error } = await sb.from('profiles').update({ verified_plus: true }).eq('id', fundiId);
    if (error) throw error;
  } else if (status === 'rejected') {
    const { error } = await sb.from('profiles').update({ verified_plus: false }).eq('id', fundiId);
    if (error) throw error;
  }

  // Tell the fundi the outcome — fire-and-forget, never fatal.
  if (status === 'approved') {
    await notifyUser(
      sb,
      fundiId,
      'Tukola: Congratulations! You passed full vetting and earned the Verified+ badge. Employers can now see your verified profile.'
    );
  } else if (status === 'rejected') {
    const reason = notes?.trim();
    await notifyUser(
      sb,
      fundiId,
      `Tukola: Your Verified+ vetting was not approved${reason ? ` — ${reason}` : ''}. Please review your documents on your profile and resubmit, or contact support.`
    );
  }

  return { status };
}

/** A fundi's latest review row, if any (for their own status view). */
export async function getLatestReview(fundiId: string) {
  const sb = createServerSupabase();
  const { data, error } = await sb
    .from('vetting_reviews')
    .select('status, id_ok, lc_letter_ok, certificate_ok, issuer_check_ok, police_clearance_ok, notes, created_at, reviewed_at')
    .eq('fundi_id', fundiId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}
