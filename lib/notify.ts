/**
 * notify.ts — transactional SMS to users (NOT OTP).
 *
 * One fire-and-forget helper used by payment/invite flows so a fundi
 * learns the moment money moves: booked, held, released. These are
 * plain-language texts, never marketing.
 *
 * Delivery: EgoSMS when SMS_PROVIDER=egosms; logged otherwise (mock).
 * Every call is safe to drop — notification failure must never break
 * the underlying payment or booking action.
 */

const baseUrl = () =>
  (process.env.EGOSMS_BASE_URL ?? 'https://comms.egosms.co/api/v1/json/').replace(/\/+$/, '') + '/';

export async function sendPlainSms(phone: string, message: string): Promise<void> {
  try {
    if ((process.env.SMS_PROVIDER ?? 'mock') !== 'egosms') {
      console.log(`[notify/mock] SMS to ${phone}: ${message}`);
      return;
    }
    const username = process.env.EGOSMS_USERNAME;
    const password = process.env.EGOSMS_PASSWORD;
    if (!username || !password) return;

    const senderId = process.env.EGOSMS_SENDER_ID || undefined;
    const res = await fetch(baseUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        method: 'SendSms',
        userdata: { username, password },
        msgdata: [{
          number: phone.replace(/^\+/, ''),
          message,
          ...(senderId ? { senderid: senderId } : {}),
        }],
      }),
    });
    const data: any = await res.json().catch(() => null);
    if (!res.ok || data?.Status !== 'OK') {
      console.warn(`[notify] EgoSMS rejected SMS to ${phone}: ${data?.Message ?? res.status}`);
    }
  } catch (err) {
    console.warn('[notify] SMS failed (non-fatal):', err);
  }
}

/**
 * Notify a user by profile id. Looks up their phone server-side —
 * callers never pass phone numbers from the client.
 */
export async function notifyUser(
  sb: ReturnType<typeof import('./supabase-server').createServerSupabase>,
  userId: string,
  message: string
): Promise<void> {
  try {
    const { data } = await sb.from('profiles').select('phone').eq('id', userId).maybeSingle();
    if (!data?.phone) return;
    await sendPlainSms(data.phone, message);
  } catch (err) {
    console.warn('[notify] lookup failed (non-fatal):', err);
  }
}

/** Convenience: notify about a job, prefixing with the job title. */
export async function notifyJobEvent(
  sb: ReturnType<typeof import('./supabase-server').createServerSupabase>,
  jobId: string,
  userId: string,
  buildMessage: (jobTitle: string) => string
): Promise<void> {
  try {
    const { data } = await sb.from('jobs').select('title').eq('id', jobId).maybeSingle();
    await notifyUser(sb, userId, buildMessage(data?.title ?? 'your job'));
  } catch (err) {
    console.warn('[notify] job lookup failed (non-fatal):', err);
  }
}
