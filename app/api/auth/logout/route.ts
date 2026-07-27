import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/session';

/** POST /api/auth/logout — clears the server session cookie. */
export async function POST() {
  const res = NextResponse.json({ success: true });
  clearSessionCookie(res);
  return res;
}
