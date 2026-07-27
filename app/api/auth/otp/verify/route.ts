import { NextRequest, NextResponse } from 'next/server';
import { normalizeUgPhone } from '@/lib/phone';
import { getSmsProvider } from '@/lib/sms/provider';
import { createServerSupabase, mapUser } from '@/lib/supabase-server';
import { setSessionCookie } from '@/lib/session';
import { hit } from '@/lib/rate-limit';

/**
 * POST /api/auth/otp/verify
 * Body: { phone, code }
 *
 * Verifies the OTP through the configured SmsProvider.
 *   - Returning user (profile exists for this phone): a server session is
 *     issued and the EXISTING account is resumed — no new ID is ever minted.
 *   - New phone: { isNewUser: true } — the client proceeds to /role, and
 *     /api/auth/register completes signup (it independently requires proof
 *     of recent verification, so this response alone cannot mint accounts).
 */
export async function POST(req: NextRequest) {
  try {
    const { phone: rawPhone, code } = await req.json();
    const phone = normalizeUgPhone(rawPhone);

    if (!phone || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: 'Enter the 6-digit code' }, { status: 400 });
    }

    // Rate limit verify attempts per phone (belt; per-code attempts are
    // additionally capped in the OTP store)
    if (!hit(`otp:verify:${phone}`, 10, 10 * 60 * 1000)) {
      return NextResponse.json(
        { error: 'Too many attempts. Please request a new code.' },
        { status: 429 }
      );
    }

    const provider = getSmsProvider();
    const ok = await provider.verifyOtp(phone, code);
    if (!ok) {
      return NextResponse.json({ error: 'Incorrect or expired code' }, { status: 401 });
    }

    const sb = createServerSupabase();
    const { data: existing } = await sb
      .from('profiles')
      .select('*')
      .eq('phone', phone)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ verified: true, isNewUser: true, phone });
    }

    if (existing.blocked) {
      return NextResponse.json({ error: 'This account is blocked. Contact support.' }, { status: 403 });
    }

    // Returning user — resume their existing account
    const res = NextResponse.json({ verified: true, isNewUser: false, user: mapUser(existing) });
    setSessionCookie(res, existing.id);
    return res;
  } catch (err: any) {
    console.error('[POST /api/auth/otp/verify]', err);
    return NextResponse.json({ error: 'Verification failed. Please try again.' }, { status: 500 });
  }
}
