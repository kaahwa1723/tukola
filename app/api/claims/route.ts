import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { fileClaim, listClaimsForUser, GuaranteeError } from '@/lib/guarantee';

/**
 * POST /api/claims
 * Body: { jobId, reason, photoUrls?: string[], amountClaimed?: number }
 *
 * File a guarantee claim on one of MY completed, paid jobs. Identity is
 * session-derived; ownership of the job is validated server-side from the
 * jobs row — never from client-supplied IDs. One open claim per job
 * (enforced by the DB partial unique index in migration 009).
 *
 * photoUrls are stored verbatim (text array) — photo STORAGE is not wired
 * yet; the claim form currently collects the reason only.
 *
 * GET /api/claims
 *
 * My claims, newest first — for the customer-facing claim status list.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { jobId, reason, photoUrls, amountClaimed } = await req.json().catch(() => ({}));
    if (!jobId || typeof jobId !== 'string') {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
    }

    const claim = await fileClaim(
      user.id,
      jobId,
      reason ?? '',
      Array.isArray(photoUrls) ? photoUrls : [],
      typeof amountClaimed === 'number' ? amountClaimed : null
    );

    return NextResponse.json({
      success: true,
      claim,
      message: 'Claim submitted. Our team will review it — guarantee refunds are capped at UGX 200,000.',
    }, { status: 201 });
  } catch (err: any) {
    if (err instanceof GuaranteeError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('[POST /api/claims]', err);
    return NextResponse.json({ error: 'Could not submit the claim. Please try again.' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const claims = await listClaimsForUser(user.id);
    return NextResponse.json({ claims });
  } catch (err: any) {
    console.error('[GET /api/claims]', err);
    return NextResponse.json({ error: 'Could not load your claims.' }, { status: 500 });
  }
}
