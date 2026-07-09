import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, mapUser } from '@/lib/supabase-server';

type Params = { params: { id: string } };

/**
 * PATCH /api/admin/users/[id]
 * Body: { isVerified?, blocked? }
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const body = await req.json();
    const updates: Record<string, any> = {};

    if (body.isVerified !== undefined) updates.is_verified = body.isVerified;
    if (body.blocked    !== undefined) updates.blocked     = body.blocked;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const sb = createServerSupabase();
    const { data, error } = await sb
      .from('profiles')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ user: mapUser(data) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** DELETE /api/admin/users/[id] — hard delete */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const sb = createServerSupabase();
    const { error } = await sb.from('profiles').delete().eq('id', params.id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
