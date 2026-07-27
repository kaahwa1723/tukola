import { NextRequest, NextResponse } from 'next/server';
import { getAdminSessionSecret, adminSessionToken } from '@/lib/admin-auth';

/**
 * POST /api/admin/auth
 * Body: { pin: string }
 * Validates the admin PIN against the ADMIN_PIN env var.
 * Fails closed: if ADMIN_PIN or ADMIN_SESSION_SECRET is not configured,
 * access is always denied — there are no hardcoded fallback credentials.
 * On success, sets an HttpOnly `kola_admin` session cookie (HMAC, 8h).
 */
export async function POST(req: NextRequest) {
  const { pin } = await req.json();
  const configuredPin = process.env.ADMIN_PIN;
  const secret = getAdminSessionSecret();

  if (!pin || !configuredPin || !secret || pin !== configuredPin) {
    return NextResponse.json({ valid: false }, { status: 401 });
  }

  const token = adminSessionToken(secret);

  const res = NextResponse.json({ valid: true });
  res.cookies.set('kola_admin', token, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    maxAge: 8 * 60 * 60, // 8 hours
  });
  return res;
}
