/**
 * error-report.ts — the platform's alarm bell (Rebuild plan, Layer 9).
 *
 * One call at the catch-points that matter (payments, webhook, crons,
 * OTP, escrow payout):
 *
 *   reportError('payments.fund', err, { jobId, amount });
 *
 * What it does, in order:
 *   1. console.error — always (lands in Vercel runtime logs).
 *   2. PostHog `error_occurred` event — trends dashboard (are failures
 *      rising? which scope?).
 *   3. Rate-limited email alert to the founder via the existing email
 *      provider (Resend → info@tukolaapp.com → forwards to Gmail).
 *
 * Rate limiting is BEST-EFFORT: in-memory, so on serverless it resets
 * between instances. Worst case after a cold start a meltdown sends one
 * email per scope per 10 minutes per instance — acceptable, and far
 * better than silence. Never throws: an alarm must never break the app.
 */

import { getEmailProvider } from './email/provider';
import { track } from './analytics';

const ALERT_EMAIL = process.env.ALERT_EMAIL ?? 'info@tukolaapp.com';

const PER_SCOPE_INTERVAL_MS = 10 * 60 * 1000; // one email per scope per 10 min
const GLOBAL_MAX_PER_HOUR = 6;                 // absolute cap per instance

const lastEmailAt = new Map<string, number>();
const sentAt: number[] = [];

function canEmail(scope: string): boolean {
  const now = Date.now();
  const last = lastEmailAt.get(scope) ?? 0;
  if (now - last < PER_SCOPE_INTERVAL_MS) return false;
  while (sentAt.length && now - sentAt[0] > 60 * 60 * 1000) sentAt.shift();
  if (sentAt.length >= GLOBAL_MAX_PER_HOUR) return false;
  lastEmailAt.set(scope, now);
  sentAt.push(now);
  return true;
}

function describe(err: unknown): string {
  if (err instanceof Error) return `${err.name}: ${err.message}`;
  try { return JSON.stringify(err)?.slice(0, 500) ?? String(err); }
  catch { return String(err); }
}

function describeContext(context?: Record<string, unknown>): string {
  if (!context) return '(none)';
  try { return JSON.stringify(context, null, 2).slice(0, 1500); }
  catch { return '(unserializable)'; }
}

export function reportError(
  scope: string,
  err: unknown,
  context?: Record<string, unknown>
): void {
  // 1. Always hit the runtime log.
  console.error(`[error-report:${scope}]`, err, context ?? '');

  const message = describe(err).slice(0, 500);

  // 2. PostHog trend event — fire-and-forget, no-op without POSTHOG_KEY.
  try {
    track('error_occurred', 'system', { scope, message, ...context });
  } catch {}

  // 3. Founder email — rate-limited, fire-and-forget.
  if (!canEmail(scope)) return;
  const when = new Date().toISOString();
  const text = [
    `Something broke on Tukola (tukolaapp.com).`,
    ``,
    `Where:  ${scope}`,
    `When:   ${when} (UTC)`,
    `Error:  ${message}`,
    ``,
    `Context:`,
    describeContext(context),
    ``,
    `Full logs: Vercel → tukola project → Logs tab (search "[error-report:${scope}]").`,
    ``,
    `This alert is rate-limited: max one email per problem area per 10 minutes.`,
  ].join('\n');

  getEmailProvider()
    .send({
      to: ALERT_EMAIL,
      subject: `🚨 Tukola error: ${scope}`,
      text,
      html: `<pre style="font:13px/1.5 monospace;white-space:pre-wrap">${text
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')}</pre>`,
    })
    .catch((e) => console.warn('[error-report] alert email failed (non-fatal):', e));
}
