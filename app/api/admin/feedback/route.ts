import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { isAdmin } from '@/lib/admin-auth';

/**
 * GET /api/admin/feedback
 * Newest-first feedback submissions from the landing page and the in-app
 * /feedback page. Admin-only (HMAC cookie, same as claims/disputes).
 */
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const sb = createServerSupabase();
    const { data, error } = await sb
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) throw error;

    return NextResponse.json({ feedback: data ?? [] });
  } catch (err: any) {
    console.error('[GET /api/admin/feedback]', err);
    return NextResponse.json({ error: 'Could not load feedback.' }, { status: 500 });
  }
}
