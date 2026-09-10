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
      .select('id, employer_id, status, worker_done_at, pricing_type')
      .eq('id', params.id)
      .maybeSingle();

    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    if (job.employer_id !== user.id) {
      return NextResponse.json({ error: 'Only the employer who posted this job can confirm it' }, { status: 403 });
    }
    if (!job.worker_done_at) {
      return NextResponse.json({ error: 'The worker has not marked this job as done yet' }, { status: 409 });
    }

    const isMilestoneJob = job.pricing_type === 'milestone';

    // ── Which payment does this confirmation release? ────────────────
    // Standard job: the single escrow payment.
    // Milestone job: the EARLIEST stage that is held but not released —
    // stages are confirmed one at a time, in order.
    let paymentQuery = sb
      .from('payments')
      .select('id, status, milestone_id')
      .eq('job_id', params.id)
      .order('created_at', { ascending: true });
    const { data: jobPayments } = await paymentQuery;

    let targetPayment = null as null | { id: number; status: string; milestone_id: string | null };
    if (isMilestoneJob) {
      targetPayment =
        (jobPayments ?? []).find((p) => p.status === 'held') ??
        null;
    } else {
      targetPayment = (jobPayments ?? []).slice(-1)[0] ?? null;
    }

    // For milestone jobs, decide if ANY unreleased stage remains after
    // this confirmation — the job only completes when the last stage is
    // released.
    let remainingStages = 0;
    if (isMilestoneJob) {
      const { data: stages } = await sb
        .from('job_milestones')
        .select('id, payment_id')
        .eq('job_id', params.id);
      const releasedPaymentIds = new Set(
        (jobPayments ?? []).filter((p) => p.status === 'released').map((p) => p.id)
      );
      remainingStages = (stages ?? []).filter(
        (s) => !s.payment_id || !releasedPaymentIds.has(s.payment_id)
      ).length - (targetPayment && targetPayment.status === 'held' ? 1 : 0);
    }

    const completesJob = !isMilestoneJob || remainingStages <= 0;

    // Mark completed (idempotent) + bump the worker's count once
    if (completesJob && job.status !== 'completed') {
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

    // Release the stage's escrowed payment (held → released). On
    // milestone jobs this is ONE stage; the job completes only when the
    // last stage is released (handled above).
    let release = null;
    if (targetPayment && targetPayment.status === 'held') {
      release = await releasePayment(targetPayment.id);
    } else if (targetPayment && targetPayment.status === 'released') {
      release = await releasePayment(targetPayment.id); // idempotent read-back
    } else if (targetPayment && targetPayment.status === 'disputed') {
      return NextResponse.json(
        { error: 'This payment is under dispute — an admin will resolve it.' },
        { status: 409 }
      );
    } else if (targetPayment && targetPayment.status === 'pending') {
      return NextResponse.json(
        { error: 'The payment has not arrived in escrow yet. Please wait for the MoMo debit to complete.' },
        { status: 409 }
      );
    }

    // Milestone job with stages left: reset the worker's done flag so
    // the two-tap flow (worker marks done → employer confirms) repeats
    // for the next stage once it is funded.
    if (isMilestoneJob && !completesJob) {
      await sb.from('jobs').update({ worker_done_at: null }).eq('id', params.id);
    }

    // Referral rewards (Phase 2): if this completion is the employer's or
    // the fundi's FIRST released payment, pending referral credits pay out.
    // Non-fatal and idempotent — never breaks a release.
    if (completesJob) {
      await issueReferralCreditsForCompletion(params.id);
    }

    return NextResponse.json({
      success: true,
      stageReleased: isMilestoneJob,
      stagesRemaining: isMilestoneJob ? remainingStages : 0,
      jobCompleted: completesJob,
      ...(release ? { receiptNumber: release.receiptNumber, split: release.split } : {}),
    });
  } catch (err: any) {
    console.error('[POST /api/jobs/[id]/confirm-release]', err);
    return NextResponse.json({ error: 'Could not confirm and release. Please try again.' }, { status: 500 });
  }
}
