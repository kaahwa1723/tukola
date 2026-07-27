import { NextResponse } from 'next/server';

/**
 * POST /api/auth/login — RETIRED.
 *
 * This route used to mint `user_${timestamp}` identities for any phone +
 * name posted to it, with no verification — it destroyed returning-user
 * identity and let anyone claim any phone number.
 *
 * The real flow is:
 *   1. POST /api/auth/otp/request  { phone }
 *   2. POST /api/auth/otp/verify   { phone, code }
 *   3. POST /api/auth/register     { phone, name, role }  (new users only)
 */
export async function POST() {
  return NextResponse.json(
    { error: 'This endpoint is retired. Use /api/auth/otp/request to sign in.' },
    { status: 410 }
  );
}
