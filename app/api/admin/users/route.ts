import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, mapUser } from '@/lib/supabase-server';
import { isAdmin } from '@/lib/admin-auth';

/** GET /api/admin/users — all profiles, optionally filtered by role */
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const roleParam = req.nextUrl.searchParams.get('role');
    const sb = createServerSupabase();

    let query = sb
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    // Accept singular ('worker') and plural ('workers') — the DB stores singular.
    // 'all' or no param returns every registered user.
    if (roleParam && roleParam !== 'all') {
      const role = roleParam.replace(/s$/, '');
      if (role === 'worker' || role === 'employer') query = query.eq('role', role);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({
      users: (data ?? []).map(r => ({ ...mapUser(r), createdAt: r.created_at })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
