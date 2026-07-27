import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { getSessionUser } from '@/lib/session';

const ALLOWED_BUCKETS = new Set(['job-images', 'profile-images']);

/**
 * POST /api/upload
 * Multipart form body:
 *   - file   : the image file
 *   - bucket : 'job-images' | 'profile-images'  (default: 'job-images')
 *
 * Returns: { url: string }
 *
 * Requires a session; uploads are namespaced under the session user's ID.
 * Bucket and folder come from the server, not the client.
 *
 * WARNING: Create the buckets in Supabase Storage (public) before using this route:
 *   • job-images
 *   • profile-images
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const formData = await req.formData();
    const file     = formData.get('file') as File | null;
    const bucket   = (formData.get('bucket') as string) ?? 'job-images';

    if (!file) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }

    if (!ALLOWED_BUCKETS.has(bucket)) {
      return NextResponse.json({ error: 'Invalid bucket' }, { status: 400 });
    }

    // Validate type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 415 });
    }

    // Max 5 MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File must be under 5 MB' }, { status: 413 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer      = Buffer.from(arrayBuffer);
    const ext         = file.name.split('.').pop() ?? 'jpg';
    const fileName    = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const sb = createServerSupabase();
    const { error: uploadError } = await sb.storage
      .from(bucket)
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = sb.storage.from(bucket).getPublicUrl(fileName);

    return NextResponse.json({ url: urlData.publicUrl });
  } catch (err: any) {
    console.error('[POST /api/upload]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
