import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin-auth';
import { resolveClaim, GuaranteeError } from '@/lib/guarantee';

type Params = { params: { id: string } };

/**
 * POST /api/admin/claims/[id]/resolve
 * Body: { resolution: 'approve_redo' | 'approve_refund' | 'reject',
 *         note?: string, amount?: number }
 *
 *   approve_redo   → claim approved, we dispatch a re-do (manual op;
 *                    recorded in the note). No reserve money moves.
 *   approve_refund → payout from the guarantee reserve, capped at
 *                    min(amount ?? amount_claimed ?? cap, UGX 200,000,
 *                    current reserve balance) — the reserve can never be
 *                    overdrawn. Written as an append-only payout row in
 *                    guarantee_reserve (lib/guarantee.ts).
 *   reject         → terminal; note required (the customer sees why).
 *
 * Every resolution is attributable (reviewed_by) — admin actions must be
 * audit-logged (Layer 6), same as dispute resolution.
 */
export async function POST(req: NextRequest, { params }: Params) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { resolution, note, amount } = await req.json().catch(() => ({}));
    if (!['approve_redo', 'approve_refund', 'reject'].includes(resolution)) {
      return NextResponse.json(
        { error: 'resolution must be "approve_redo", "approve_refund" or "reject"' },
        { status: 400 }
      );
    }

    const claimId = Number(params.id);
    if (!Number.isFinite(claimId)) {
      return NextResponse.json({ error: 'Invalid claim id' }, { status: 400 });
    }

    const claim = await resolveClaim(
      claimId,
      'admin',
      resolution,
      note ?? null,
      typeof amount === 'number' ? amount : null
    );

    console.log(`[admin] claim #${claimId} resolved as ${claim.status} (approved: ${claim.amountApproved ?? 0})`);
    return NextResponse.json({ success: true, claim });
  } catch (err: any) {
    if (err instanceof GuaranteeError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('[POST /api/admin/claims/[id]/resolve]', err);
    return NextResponse.json({ error: 'Could not resolve the claim.' }, { status: 500 });
  }
}
