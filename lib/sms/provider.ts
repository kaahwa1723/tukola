import { checkOtp } from '../otp';

/**
 * SmsProvider — swappable SMS OTP vendor interface.
 *
 * The production vendor will be a Ugandan aggregator at UGX 25–35/SMS
 * (NOT Twilio at ~UGX 1,000/SMS). Candidates: Africa's Talking, Beem,
 * Uganda Telecom wholesale, or a local Kampala aggregator. Sender ID
 * registration (~UGX 300K) is handled by the founder.
 *
 * To swap vendors: implement this interface, add it to the factory below,
 * and set SMS_PROVIDER in the environment. Nothing else in the codebase
 * changes.
 *
 *   sendOtp(phone, code)   — deliver `code` to `phone` (E.164, +256...)
 *   verifyOtp(phone, code) — true when the code is valid for that phone.
 *     Vendors with hosted verification (rare among Ugandan aggregators)
 *     check with the vendor; everyone else delegates to our DB-backed
 *     checkOtp(), which is the default used by MockSmsProvider.
 */
export interface SmsProvider {
  readonly name: string;
  sendOtp(phone: string, code: string): Promise<void>;
  verifyOtp(phone: string, code: string): Promise<boolean>;
}

/**
 * MockSmsProvider — no SMS is sent. The code is logged server-side, and
 * in non-production builds the API response includes it as `devCode` so
 * the flow is testable end-to-end without a vendor account.
 * Verification uses the same DB-backed path a real provider would use,
 * so switching vendors does not change verification semantics.
 */
class MockSmsProvider implements SmsProvider {
  readonly name = 'mock';

  async sendOtp(phone: string, code: string): Promise<void> {
    console.log(`[MockSmsProvider] OTP for ${phone}: ${code}`);
  }

  async verifyOtp(phone: string, code: string): Promise<boolean> {
    return checkOtp(phone, code);
  }
}

// ── Factory ────────────────────────────────────────────────────────────────
// Template for the real vendor (fill in when the aggregator contract lands):
//
//   class AfricasTalkingProvider implements SmsProvider {
//     readonly name = 'africas_talking';
//     async sendOtp(phone, code) { /* POST to AT SMS API with SmsProvider creds */ }
//     async verifyOtp(phone, code) { return checkOtp(phone, code); }
//   }

/**
 * AfricasTalkingProvider — live SMS via Africa's Talking
 * (https://africastalking.com), the pragmatic Ugandan aggregator.
 *
 * Env:
 *   AT_API_KEY    — required (never logged, never included in errors)
 *   AT_USERNAME   — required; the literal value 'sandbox' switches to the
 *                   sandbox endpoint (https://api.sandbox.africastalking.com)
 *   AT_SENDER_ID  — optional; registered alphanumeric sender ID (~UGX 300K,
 *                   founder handles registration). Omit to send from AT's
 *                   default shared route.
 *
 * Verification does NOT go through the vendor — AT has no hosted OTP
 * verification for plain SMS — so verifyOtp delegates to the same
 * DB-backed checkOtp() the mock uses. Swapping providers therefore
 * changes delivery only, never verification semantics.
 *
 * Error discipline: any failure throws with a sanitized message
 * (status + AT's machine-readable statusMessage). The API key is
 * NEVER part of the thrown message or any log line.
 */
class AfricasTalkingProvider implements SmsProvider {
  readonly name = 'africas_talking';

  private readonly apiKey: string;
  private readonly username: string;
  private readonly senderId?: string;
  private readonly baseUrl: string;

  constructor() {
    const apiKey = process.env.AT_API_KEY;
    const username = process.env.AT_USERNAME;
    if (!apiKey || !username) {
      throw new Error("Africa's Talking not configured (AT_API_KEY, AT_USERNAME required)");
    }
    this.apiKey = apiKey;
    this.username = username;
    this.senderId = process.env.AT_SENDER_ID || undefined;
    this.baseUrl = username === 'sandbox'
      ? 'https://api.sandbox.africastalking.com/version1/messaging'
      : 'https://api.africastalking.com/version1/messaging';
  }

  async sendOtp(phone: string, code: string): Promise<void> {
    const body = new URLSearchParams({
      username: this.username,
      to: phone,
      message: `Your One Time Password for tukolaapp.com is ${code}, expires in 10 mins. Do not share this code.`,
    });
    if (this.senderId) body.set('from', this.senderId);

    let res: Response;
    try {
      res = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          apiKey: this.apiKey,
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });
    } catch {
      // Network failure — sanitize: never surface internals (or the key)
      throw new Error("Africa's Talking request failed (network error)");
    }

    if (!res.ok) {
      throw new Error(`Africa's Talking SMS failed (HTTP ${res.status})`);
    }

    // AT returns 200/201 with per-recipient statuses; a "failed" status
    // inside a 2xx body is still a delivery failure.
    const data: any = await res.json().catch(() => null);
    const recipients = data?.SMSMessageData?.Recipients;
    if (Array.isArray(recipients) && recipients.length > 0) {
      const failed = recipients.find((r: any) =>
        typeof r?.status === 'string' && !/success/i.test(r.status));
      if (failed) {
        // statusMessage is AT's own sanitized text ('InsufficientBalance',
        // 'InvalidPhoneNumber', …) — safe to surface, contains no secrets.
        throw new Error(`Africa's Talking SMS rejected: ${failed.statusMessage ?? failed.status}`);
      }
    }
  }

  async verifyOtp(phone: string, code: string): Promise<boolean> {
    return checkOtp(phone, code);
  }
}

/**
 * EgoSmsProvider — live SMS via EgoSMS (https://egosms.co), a Ugandan
 * aggregator (~UGX 35/SMS, balance never expires, default sender ID free,
 * MoMo top-up). JSON API documented at developers.pahappa.com:
 *
 *   POST https://comms.egosms.co/api/v1/json/
 *   (the www.egosms.co endpoint rejects valid accounts with
 *   "user not active" — EgoSMS support directed us to comms., 10 Sep 2026)
 *   { method: 'SendSms',
 *     userdata: { username, password },
 *     msgdata: [{ number: '2567...', message, senderid }] }
 *   → { Status: 'OK', Cost, MsgFollowUpUniqueCode }   (success)
 *   → { Status: 'Failed', Message }                   (failure)
 *
 * Env:
 *   EGOSMS_USERNAME  — required (account login username)
 *   EGOSMS_PASSWORD  — required (account API password; never logged,
 *                      never included in errors)
 *   EGOSMS_BASE_URL  — optional override; defaults to comms.egosms.co
 *   EGOSMS_SENDER_ID — optional; max 11 chars. Omit to use EgoSMS's
 *                      default shared sender ID.
 *
 * EgoSMS has no hosted OTP verification, so verifyOtp delegates to the
 * same DB-backed checkOtp() the mock uses — swapping providers changes
 * delivery only, never verification semantics.
 */
class EgoSmsProvider implements SmsProvider {
  readonly name = 'egosms';

  private readonly username: string;
  private readonly password: string;
  private readonly senderId?: string;
  private readonly baseUrl =
    (process.env.EGOSMS_BASE_URL ?? 'https://comms.egosms.co/api/v1/json/').replace(/\/+$/, '') + '/';

  constructor() {
    const username = process.env.EGOSMS_USERNAME;
    const password = process.env.EGOSMS_PASSWORD;
    if (!username || !password) {
      throw new Error('EgoSMS not configured (EGOSMS_USERNAME, EGOSMS_PASSWORD required)');
    }
    this.username = username;
    this.password = password;
    this.senderId = process.env.EGOSMS_SENDER_ID || undefined;
  }

  async sendOtp(phone: string, code: string): Promise<void> {
    // EgoSMS wants the number without the leading '+' (e.g. 2567xxxxxxxx)
    const number = phone.replace(/^\+/, '');

    let res: Response;
    try {
      res = await fetch(this.baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          method: 'SendSms',
          userdata: { username: this.username, password: this.password },
          msgdata: [{
            number,
            message: `Your One Time Password for tukolaapp.com is ${code}, expires in 10 mins. Do not share this code.`,
            ...(this.senderId ? { senderid: this.senderId } : {}),
          }],
        }),
      });
    } catch {
      throw new Error('EgoSMS request failed (network error)');
    }

    if (!res.ok) {
      throw new Error(`EgoSMS SMS failed (HTTP ${res.status})`);
    }

    // EgoSMS returns 200 with {"Status":"Failed","Message":...} on
    // rejection — a 2xx transport does not mean the SMS was accepted.
    const data: any = await res.json().catch(() => null);
    if (data?.Status !== 'OK') {
      // Message is EgoSMS's own sanitized error text (no secrets).
      throw new Error(`EgoSMS SMS rejected: ${data?.Message ?? 'unknown error'}`);
    }
  }

  async verifyOtp(phone: string, code: string): Promise<boolean> {
    return checkOtp(phone, code);
  }
}

export function getSmsProvider(): SmsProvider {
  switch (process.env.SMS_PROVIDER ?? 'mock') {
    case 'egosms':
      return new EgoSmsProvider();
    case 'africas_talking':
      return new AfricasTalkingProvider();
    case 'mock':
    default:
      return new MockSmsProvider();
  }
}
