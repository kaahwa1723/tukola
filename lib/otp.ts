import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { createServerSupabase } from './supabase-server';
import { getSessionSecret } from './session';

/**
 * OTP issuance & verification, backed by the `otp_codes` table
 * (migration 004_identity.sql).
 *
 * Design:
 *   - 6-digit codes, crypto-random
 *   - codes stored as HMAC hashes, never plaintext
 *   - 10-minute expiry (DPPA retention schedule: OTP data lives 10 minutes)
 *   - max 5 verification attempts per code
 *   - one active code per phone (requesting a new code kills the old one)
 *   - a consumed code doubles as the "this phone was recently verified"
 *     marker that /api/auth/register requires before creating an account
 */

export const OTP_TTL_MS = 10 * 60 * 1000;        // 10 minutes
export const OTP_MAX_ATTEMPTS = 5;
export const REGISTER_WINDOW_MS = 30 * 60 * 1000; // signup allowed within 30 min of verify

function hashCode(phone: string, code: string): string {
  return createHmac('sha256', getSessionSecret()).update(`${phone}:${code}`).digest('hex');
}

/** Generate a fresh OTP for a phone (invalidating any prior active code). */
export async function createOtp(phone: string): Promise<string> {
  const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
  const sb = createServerSupabase();

  await sb.from('otp_codes').delete().eq('phone', phone).eq('consumed', false);

  const { error } = await sb.from('otp_codes').insert({
    phone,
    code_hash: hashCode(phone, code),
    expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString(),
    attempts: 0,
    consumed: false,
  });
  if (error) throw error;

  return code;
}

/**
 * Verify an OTP. Returns true on success (and consumes the code).
 * Every failure path increments attempts; a code is dead after 5 tries.
 */
export async function checkOtp(phone: string, code: string): Promise<boolean> {
  const sb = createServerSupabase();

  const { data: row } = await sb
    .from('otp_codes')
    .select('*')
    .eq('phone', phone)
    .eq('consumed', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row) return false;
  if (new Date(row.expires_at).getTime() < Date.now()) return false;
  if (row.attempts >= OTP_MAX_ATTEMPTS) return false;

  // Count this attempt regardless of outcome
  await sb.from('otp_codes').update({ attempts: row.attempts + 1 }).eq('id', row.id);

  const expected = hashCode(phone, code);
  const a = Buffer.from(row.code_hash, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  const match = a.length === b.length && timingSafeEqual(a, b);

  if (match) {
    await sb.from('otp_codes').update({ consumed: true }).eq('id', row.id);
  }
  return match;
}

/**
 * True when this phone completed OTP verification within the register
 * window. /api/auth/register requires this so account creation is always
 * bound to a verified phone number.
 */
export async function hasRecentVerification(phone: string): Promise<boolean> {
  const sb = createServerSupabase();
  const since = new Date(Date.now() - REGISTER_WINDOW_MS).toISOString();

  const { data } = await sb
    .from('otp_codes')
    .select('id')
    .eq('phone', phone)
    .eq('consumed', true)
    .gte('created_at', since)
    .limit(1);

  return (data?.length ?? 0) > 0;
}
