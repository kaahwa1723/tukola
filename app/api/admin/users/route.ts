import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, mapUser } from '@/lib/supabase-server';

/** GET /api/admin/users — all profiles, optionally filtered by role */
export async function GET(req: NextRequest) {
  try {
    const role = req.nextUrl.searchParams.get('role');
    const sb = createServerSupabase();

    let query = sb
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (role) query = query.eq('role', role);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ users: (data ?? []).map(mapUser) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
