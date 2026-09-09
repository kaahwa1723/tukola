/**
 * EmailProvider — swappable transactional email vendor interface.
 *
 * Same provider-swap pattern as lib/sms/provider.ts: implement this
 * interface, add it to the factory below, and set EMAIL_PROVIDER in the
 * environment. Nothing else in the codebase changes.
 *
 *   send({ to, subject, html, text }) — deliver one transactional email.
 *
 * Env:
 *   EMAIL_PROVIDER  — 'mock' (default) | 'resend'
 *   EMAIL_FROM      — sender identity, default 'Tukola <no-reply@tukolaapp.com>'
 *   RESEND_API_KEY  — required when EMAIL_PROVIDER=resend (never logged,
 *                     never included in errors)
 */

export interface SendEmailArgs {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailProvider {
  readonly name: string;
  send(args: SendEmailArgs): Promise<void>;
}

/**
 * MockEmailProvider — no email is sent. The email is logged server-side
 * so the lifecycle wiring is testable end-to-end without a vendor account.
 */
class MockEmailProvider implements EmailProvider {
  readonly name = 'mock';

  async send(args: SendEmailArgs): Promise<void> {
    console.log(`[MockEmailProvider] To: ${args.to} | Subject: ${args.subject}\n${args.text}`);
  }
}

/**
 * ResendProvider — live transactional email via Resend
 * (https://resend.com). Plain HTTPS API, no SDK dependency:
 *
 *   POST https://api.resend.com/emails
 *   Authorization: Bearer RESEND_API_KEY
 *   { from, to, subject, html, text }
 *
 * Deliverability requires the sending domain (tukolaapp.com) to be
 * verified in the Resend dashboard (SPF/DKIM DNS records) — founder task.
 *
 * Error discipline: any failure throws with a sanitized message
 * (HTTP status only). The API key is NEVER part of the thrown message
 * or any log line.
 */
class ResendProvider implements EmailProvider {
  readonly name = 'resend';

  private readonly apiKey: string;
  private readonly from: string;
  private readonly baseUrl = 'https://api.resend.com/emails';

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('Resend not configured (RESEND_API_KEY required)');
    }
    this.apiKey = apiKey;
    this.from = process.env.EMAIL_FROM ?? 'Tukola <no-reply@tukolaapp.com>';
  }

  async send(args: SendEmailArgs): Promise<void> {
    let res: Response;
    try {
      res = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          from: this.from,
          to: args.to,
          subject: args.subject,
          html: args.html,
          text: args.text,
        }),
      });
    } catch {
      // Network failure — sanitize: never surface internals (or the key)
      throw new Error('Resend request failed (network error)');
    }

    if (!res.ok) {
      throw new Error(`Resend email failed (HTTP ${res.status})`);
    }
  }
}

// ── Factory ────────────────────────────────────────────────────────────────
export function getEmailProvider(): EmailProvider {
  switch (process.env.EMAIL_PROVIDER ?? 'mock') {
    case 'resend':
      return new ResendProvider();
    case 'mock':
    default:
      return new MockEmailProvider();
  }
}
