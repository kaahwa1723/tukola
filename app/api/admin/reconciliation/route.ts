import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { isAdmin } from '@/lib/admin-auth';

/**
 * GET /api/admin/reconciliation?status=open
 * Lists reconciliation flags (default: open) with the payment's amount
 * and status joined in, newest first. Admin only.
 */
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const status = req.nextUrl.searchParams.get('status') ?? 'open';
    const sb = createServerSupabase();

    let query = sb
      .from('reconciliation_flags')
      .select('*, payments(amount, status, job_id, receipt_number)')
      .order('created_at', { ascending: false })
      .limit(200);
    if (status !== 'all') query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;

    const flags = (data ?? []).map((f: any) => ({
      id: f.id,
      paymentId: f.payment_id,
      flagType: f.flag_type,
      detail: f.detail,
      status: f.status,
      resolvedBy: f.resolved_by ?? undefined,
      resolvedAt: f.resolved_at ?? undefined,
      createdAt: f.created_at,
      paymentAmount: f.payments?.amount,
      paymentStatus: f.payments?.status,
      jobId: f.payments?.job_id,
      receiptNumber: f.payments?.receipt_number ?? undefined,
    }));

    const openCount = status === 'open'
      ? flags.length
      : flags.filter(f => f.status === 'open').length;

    return NextResponse.json({ flags, openCount });
  } catch (err: any) {
    console.error('[GET /api/admin/reconciliation]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
