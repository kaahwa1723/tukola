/**
 * Server-side analytics — a single track() call behind env config.
 *
 * PostHog is the target (EU cloud for data-residency comfort), but this
 * module is the only place that knows that — swap providers by editing
 * this one file. When POSTHOG_KEY is not set, track() is a silent no-op
 * (local dev costs nothing, and no event is ever fabricated).
 *
 * All 10 Phase-0 funnel events are emitted server-side from the API routes
 * where the action actually completes — the client cannot fake an event.
 */

export type FunnelEvent =
  | 'signup'
  | 'otp_verified'
  | 'job_posted'
  | 'application_sent'
  | 'applicant_accepted'
  | 'payment_held'
  | 'job_completed'
  | 'payment_released'
  | 'rating_submitted'
  | 'dispute_opened'
  | 'leakage_signal'
  // Phase 2 — referral mechanics
  | 'referral_attributed'
  | 'referral_shared'
  | 'referral_credit_issued'
  // Phase 2 — guarantee claims
  | 'claim_submitted'
  | 'claim_approved'
  | 'claim_rejected'
  // Phase 2 — worker service listings (migration 016)
  | 'service_posted'
  | 'service_booked';

export function track(
  event: FunnelEvent,
  distinctId: string,
  properties: Record<string, unknown> = {}
): void {
  const key = process.env.POSTHOG_KEY;
  if (!key) return; // no-op when analytics is not configured

  const host = process.env.POSTHOG_HOST ?? 'https://eu.posthog.com';

  // Fire-and-forget: analytics must never break a user action
  fetch(`${host}/capture/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: key,
      event,
      distinct_id: distinctId,
      properties: {
        ...properties,
        $lib: 'tukola-server',
        source: 'api',
      },
      timestamp: new Date().toISOString(),
    }),
  }).catch(e => console.warn(`[analytics] ${event} failed:`, e.message));
}
