import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { isAdmin } from '@/lib/admin-auth';

/**
 * GET  /api/admin/site-mode — current site mode ('coming_soon' | 'live').
 * POST /api/admin/site-mode — flip it. Body: { mode: 'coming_soon' | 'live' }
 *
 * The single control for the shelved-site gate (middleware.ts). Admin-only.
 * Fail-CLOSED on read errors, same as the middleware: report coming_soon
 * rather than accidentally exposing the marketplace.
 */
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const sb = createServerSupabase();
    const { data, error } = await sb
      .from('site_settings')
      .select('value, updated_at')
      .eq('key', 'site_mode')
      .maybeSingle();
    if (error) throw error;
    return NextResponse.json({
      mode: data?.value === 'live' ? 'live' : 'coming_soon',
      updatedAt: data?.updated_at ?? null,
    });
  } catch (err) {
    console.error('[GET /api/admin/site-mode]', err);
    return NextResponse.json({ mode: 'coming_soon', updatedAt: null });
  }
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => null);
    const mode = body?.mode;
    if (mode !== 'coming_soon' && mode !== 'live') {
      return NextResponse.json({ error: "mode must be 'coming_soon' or 'live'." }, { status: 400 });
    }
    const sb = createServerSupabase();
    const { error } = await sb
      .from('site_settings')
      .upsert({ key: 'site_mode', value: mode, updated_at: new Date().toISOString() });
    if (error) throw error;
    return NextResponse.json({ ok: true, mode });
  } catch (err) {
    console.error('[POST /api/admin/site-mode]', err);
    return NextResponse.json({ error: 'Could not switch the site mode. Please try again.' }, { status: 500 });
  }
}
