import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { normalizeUgPhone } from '@/lib/phone';
import { hasRecentVerification } from '@/lib/otp';
import { createServerSupabase, mapUser } from '@/lib/supabase-server';
import { setSessionCookie } from '@/lib/session';
import { hit, clientIp } from '@/lib/rate-limit';
import { track } from '@/lib/analytics';
import { attributeSignup } from '@/lib/referrals';
import { sendWelcomeEmail } from '@/lib/email/notify';

/**
 * POST /api/auth/register
 * Body: { phone, name, role }
 *
 * Completes signup AFTER OTP verification. Hard requirements:
 *   1. the phone must have a consumed OTP within the register window
 *      (hasRecentVerification) — account creation is always bound to a
 *      verified phone number;
 *   2. if a profile already exists for the phone, we resume it instead of
 *      creating a duplicate (the signup race condition and the
 *      user_${timestamp} identity bug are both killed here);
 *   3. IDs are UUIDs; no fabricated defaults (rating/response_time/
 *      last_active stay NULL until the system measures them).
 */
export async function POST(req: NextRequest) {
  try {
    const { phone: rawPhone, name, role, referralCode, sex, dateOfBirth } = await req.json();
    const phone = normalizeUgPhone(rawPhone);

    if (!phone || !name?.trim() || !['worker', 'employer'].includes(role)) {
      return NextResponse.json({ error: 'phone, name and a valid role are required' }, { status: 400 });
    }

    // Optional basic KYC — validated when present, never required to sign up
    if (sex !== undefined && sex !== null && !['male', 'female'].includes(sex)) {
      return NextResponse.json({ error: 'Invalid sex' }, { status: 400 });
    }
    let dob: string | null = null;
    if (dateOfBirth) {
      const d = new Date(dateOfBirth);
      if (isNaN(d.getTime())) {
        return NextResponse.json({ error: 'Invalid date of birth' }, { status: 400 });
      }
      const age = (Date.now() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      if (age < 18 || age > 100) {
        return NextResponse.json({ error: 'You must be 18 or older to use Tukola' }, { status: 400 });
      }
      dob = d.toISOString().slice(0, 10);
    }

    if (!hit(`register:ip:${clientIp(req)}`, 10, 10 * 60 * 1000)) {
      return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 });
    }

    if (!(await hasRecentVerification(phone))) {
      return NextResponse.json(
        { error: 'Phone number not verified. Please verify the code we sent you first.' },
        { status: 403 }
      );
    }

    const sb = createServerSupabase();

    // Existing account? Resume it — never mint a second identity for a phone
    const { data: existing } = await sb
      .from('profiles')
      .select('*')
      .eq('phone', phone)
      .maybeSingle();

    if (existing) {
      if (existing.blocked) {
        return NextResponse.json({ error: 'This account is blocked. Contact support.' }, { status: 403 });
      }
      const res = NextResponse.json({ user: mapUser(existing), resumed: true });
      setSessionCookie(res, existing.id);
      return res;
    }

    // New account — honest fields only; nothing fabricated
    const { data: created, error } = await sb
      .from('profiles')
      .insert({
        id: `usr_${randomUUID()}`,
        name: name.trim(),
        phone,
        role,
        location: null,
        rating: null,
        completed_jobs: 0,
        skills: [],
        about: '',
        response_time: null,
        last_active: null,
        is_verified: false,
        portfolio_images: [],
        sex: sex ?? null,
        date_of_birth: dob,
      })
      .select()
      .single();

    if (error) {
      // Unique-violation on phone = the race we just guarded against;
      // the other request won — resume that profile instead of failing.
      if (error.code === '23505') {
        const { data: winner } = await sb
          .from('profiles')
          .select('*')
          .eq('phone', phone)
          .single();
        if (winner) {
          const res = NextResponse.json({ user: mapUser(winner), resumed: true });
          setSessionCookie(res, winner.id);
          return res;
        }
      }
      throw error;
    }

    const res = NextResponse.json({ user: mapUser(created) }, { status: 201 });
    setSessionCookie(res, created.id);
    track('signup', created.id, { role });
    // Welcome email — fire-and-forget safe: skips silently when the new
    // profile has no email on file, and a failure never fails a signup.
    await sendWelcomeEmail({ id: created.id, name: created.name, role, email: created.email });
    // Referral attribution (Phase 2): new accounts only — a resumed
    // account was attributed (or not) at its own creation. Non-fatal:
    // an unknown/invalid code or a DB hiccup never fails a signup.
    await attributeSignup(created.id, referralCode, role);
    return res;
  } catch (err: any) {
    console.error('[POST /api/auth/register]', err);
    return NextResponse.json({ error: 'Could not create your account. Please try again.' }, { status: 500 });
  }
}
