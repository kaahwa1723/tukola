import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { getSessionUser } from '@/lib/session';
import { releasePayment } from '@/lib/escrow';
import { track } from '@/lib/analytics';
import { recomputeReliabilityScore } from '@/lib/reliability';
import { issueReferralCreditsForCompletion } from '@/lib/referrals';

type Params = { params: { id: string } };

/**
 * POST /api/jobs/[id]/confirm-release
 *
 * TAP 2 of the two-tap completion flow: the EMPLOYER confirms the work and
 * releases escrow. Consequences:
 *   - the job is marked completed (if not already),
 *   - the accepted worker's completed_jobs count bumps,
 *   - the held payment is released: 83/85% to the fundi, 17/15% commission,
 *     2% of GMV accrues to the guarantee reserve, receipt issued.
 * Idempotent: confirming twice does not pay twice.
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const sb = createServerSupabase();
    const { data: job } = await sb
      .from('jobs')
      .select('id, employer_id, status, worker_done_at')
      .eq('id', params.id)
      .maybeSingle();

    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    if (job.employer_id !== user.id) {
      return NextResponse.json({ error: 'Only the employer who posted this job can confirm it' }, { status: 403 });
    }
    if (!job.worker_done_at) {
      return NextResponse.json({ error: 'The worker has not marked this job as done yet' }, { status: 409 });
    }

    // Mark completed (idempotent) + bump the worker's count once
    if (job.status !== 'completed') {
      const { error: jobError } = await sb
        .from('jobs')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', params.id);
      if (jobError) throw jobError;

      track('job_completed', user.id, { jobId: params.id, via: 'employer_confirm' });

      const { data: accepted } = await sb
        .from('applications')
        .select('worker_id')
        .eq('job_id', params.id)
        .eq('status', 'accepted')
        .limit(1);
      const workerId = accepted?.[0]?.worker_id;
      if (workerId) {
        const { error: rpcError } = await sb.rpc('increment_completed_jobs', { profile_id: workerId });
        if (rpcError) {
          const { data: profile } = await sb.from('profiles').select('completed_jobs').eq('id', workerId).single();
          if (profile) {
            await sb.from('profiles').update({ completed_jobs: (profile.completed_jobs ?? 0) + 1 }).eq('id', workerId);
          }
        }
        // Trust field: a fresh completion moves the reliability score
        await recomputeReliabilityScore(workerId);
      }
    }

    // Release the escrowed payment for this job (if one exists and is held)
    const { data: payment } = await sb
      .from('payments')
      .select('id, status')
      .eq('job_id', params.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let release = null;
    if (payment && payment.status === 'held') {
      release = await releasePayment(payment.id);
    } else if (payment && payment.status === 'released') {
      release = await releasePayment(payment.id); // idempotent read-back
    } else if (payment && payment.status === 'disputed') {
      return NextResponse.json(
        { error: 'This payment is under dispute — an admin will resolve it.' },
        { status: 409 }
      );
    } else if (payment && payment.status === 'pending') {
      return NextResponse.json(
        { error: 'The payment has not arrived in escrow yet. Please wait for the MoMo debit to complete.' },
        { status: 409 }
      );
    }

    // Referral rewards (Phase 2): if this completion is the employer's or
    // the fundi's FIRST released payment, pending referral credits pay out.
    // Non-fatal and idempotent — never breaks a release.
    await issueReferralCreditsForCompletion(params.id);

    return NextResponse.json({
      success: true,
      ...(release ? { receiptNumber: release.receiptNumber, split: release.split } : {}),
    });
  } catch (err: any) {
    console.error('[POST /api/jobs/[id]/confirm-release]', err);
    return NextResponse.json({ error: 'Could not confirm and release. Please try again.' }, { status: 500 });
  }
}
