import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';

/**
 * GET /api/auth/me
 * Returns the profile for the current server session, or 401.
 * This replaces localStorage-as-identity: the client asks the server
 * who it is on every app boot.
 */
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  return NextResponse.json({ user });
}
