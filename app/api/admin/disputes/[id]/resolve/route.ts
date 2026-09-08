import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { isAdmin } from '@/lib/admin-auth';
import { releasePayment, transitionPayment } from '@/lib/escrow';
import { recomputeReliabilityScore } from '@/lib/reliability';

type Params = { params: { id: string } };

/**
 * POST /api/admin/disputes/[id]/resolve
 * Body: { resolution: 'release' | 'refund' }
 *
 * Admin resolves a dispute:
 *   'release' → escrow pays out to the fundi (normal splits apply)
 *   'refund'  → escrow returns to the payer (no splits, no accrual)
 * Every admin resolution is attributable (resolved_by) — admin actions
 * must be audit-logged (Layer 6).
 */
export async function POST(req: NextRequest, { params }: Params) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { resolution } = await req.json();
    if (!['release', 'refund'].includes(resolution)) {
      return NextResponse.json({ error: 'resolution must be "release" or "refund"' }, { status: 400 });
    }

    const sb = createServerSupabase();
    const { data: dispute } = await sb
      .from('disputes')
      .select('*')
      .eq('id', Number(params.id))
      .maybeSingle();

    if (!dispute) return NextResponse.json({ error: 'Dispute not found' }, { status: 404 });
    if (dispute.status !== 'open') {
      return NextResponse.json({ error: 'This dispute is already resolved' }, { status: 409 });
    }

    if (resolution === 'release') {
      await releasePayment(dispute.payment_id);
    } else {
      await transitionPayment(dispute.payment_id, 'refunded');
    }

    const { error } = await sb
      .from('disputes')
      .update({
        status: resolution === 'release' ? 'resolved_release' : 'resolved_refund',
        resolved_by: 'admin',
        resolved_at: new Date().toISOString(),
      })
      .eq('id', dispute.id);
    if (error) throw error;

    console.log(`[admin] dispute #${dispute.id} resolved as ${resolution}`);

    // Trust field: a lost dispute (refund) weighs against the fundi's
    // reliability score; a released one clears the shadow.
    const { data: payment } = await sb
      .from('payments')
      .select('payee_id')
      .eq('id', dispute.payment_id)
      .maybeSingle();
    if (payment?.payee_id) {
      await recomputeReliabilityScore(payment.payee_id);
    }

    return NextResponse.json({ success: true, resolution });
  } catch (err: any) {
    console.error('[POST /api/admin/disputes/[id]/resolve]', err);
    return NextResponse.json({ error: 'Could not resolve the dispute.' }, { status: 500 });
  }
}
