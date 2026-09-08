import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { isAdmin } from '@/lib/admin-auth';

type Params = { params: { id: string } };

/**
 * PATCH /api/admin/reconciliation/[id]
 * Body: { action: 'resolve' }
 *
 * Marks a flag resolved. This NEVER edits the payment — fixes go
 * through the normal escrow flows; the flag is bookkeeping so a known
 * problem doesn't keep re-surfacing on the admin page. Resolving does
 * not block a new flag if the problem recurs (the partial unique index
 * only constrains OPEN flags).
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  if (!isAdmin(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.action !== 'resolve') {
      return NextResponse.json({ error: "Only action 'resolve' is supported" }, { status: 400 });
    }

    const sb = createServerSupabase();
    const { data, error } = await sb
      .from('reconciliation_flags')
      .update({
        status: 'resolved',
        resolved_by: 'admin',
        resolved_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .eq('status', 'open') // already resolved → no-op error path below
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'Flag not found or already resolved' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[PATCH /api/admin/reconciliation/[id]]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
