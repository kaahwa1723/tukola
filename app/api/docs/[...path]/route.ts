import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { getSessionUser } from '@/lib/session';
import { isAdmin } from '@/lib/admin-auth';

const BUCKET = 'id-documents';

/**
 * GET /api/docs/<userId>/<file>
 *
 * Authenticated proxy over the private `id-documents` storage bucket
 * (national ID, LC1 letter, certificate photos — migration 026).
 *
 * Authorization:
 *   • a signed-in user may read only objects under their own user id
 *     (uploads are namespaced `<userId>/<file>` by /api/upload)
 *   • admins may read everything — the vetting & document-review screens
 *     render these inline via plain <img src="/api/docs/...">
 *
 * The bucket itself has no storage policies, so the service role is the
 * only reader; no signed URLs are minted anywhere, meaning there is no
 * leakable link — every fetch passes through this check.
 */
export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    const segments = params.path ?? [];

    // Exactly <userId>/<file>; reject empties and traversal up front.
    if (segments.length !== 2 || segments.some(s => !s || s === '.' || s === '..')) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const objectPath = segments.join('/');

    const admin = isAdmin(req);
    if (!admin) {
      const user = await getSessionUser(req);
      if (!user) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
      }
      if (segments[0] !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const sb = createServerSupabase();
    const { data, error } = await sb.storage.from(BUCKET).download(objectPath);
    if (error || !data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Files are capped at 5 MB by /api/upload — buffering is fine.
    const buffer = Buffer.from(await data.arrayBuffer());
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': data.type || 'application/octet-stream',
        // Private docs: browser may cache briefly, shared caches never.
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch (err: any) {
    console.error('[GET /api/docs]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
