import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { isAdmin } from '@/lib/admin-auth';

/**
 * GET /api/admin/disputes
 * The admin dispute queue — open disputes with their frozen payments.
 */
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const sb = createServerSupabase();
    const { data, error } = await sb
      .from('disputes')
      .select('*, payments(amount, status, payer_id, payee_id), jobs(title, location, pay)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ disputes: data ?? [] });
  } catch (err: any) {
    console.error('[GET /api/admin/disputes]', err);
    return NextResponse.json({ error: 'Could not load disputes.' }, { status: 500 });
  }
}
