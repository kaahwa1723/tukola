import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin-auth';
import { listClaimQueue } from '@/lib/guarantee';

/**
 * GET /api/admin/claims
 * The admin guarantee-claims queue — open claims first, with job and
 * payment context. Admin-only (HMAC cookie, same as disputes).
 */
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const claims = await listClaimQueue();
    return NextResponse.json({ claims });
  } catch (err: any) {
    console.error('[GET /api/admin/claims]', err);
    return NextResponse.json({ error: 'Could not load claims.' }, { status: 500 });
  }
}
