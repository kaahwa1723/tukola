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

export function getSmsProvider(): SmsProvider {
  switch (process.env.SMS_PROVIDER ?? 'mock') {
    case 'mock':
    default:
      return new MockSmsProvider();
  }
}
