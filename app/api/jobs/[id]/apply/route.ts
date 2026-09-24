import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { getSessionUser } from '@/lib/session';
import { track } from '@/lib/analytics';
import { computeProfileCompletion } from '@/lib/profile-completion';

type Params = { params: { id: string } };

/**
 * POST /api/jobs/[id]/apply
 * Body: { clientRequestId? } — accepted for outbox correlation; dedupe is
 * structural, not key-based: UNIQUE(job_id, worker_id) + upsert means any
 * retry (offline replay, double-tap) converges to one application.
 *
 * Worker identity, name, rating, completed jobs and skills all come from
 * the server session + the profiles table — a client can no longer apply
 * as someone else or self-declare a 5.0 rating.
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (user.role !== 'worker') {
      return NextResponse.json({ error: 'Only worker accounts can apply to jobs' }, { status: 403 });
    }

    // Trust-layer gate (founder, 24 Sep 2026): a fundi cannot apply for —
    // or accept an invitation to — a job until every REQUIRED profile item
    // is done (photo, area, about, skills, MoMo payout number, national ID
    // + ID photo, next of kin). Same rule for everyone, enforced server-side.
    const completion = computeProfileCompletion(user);
    if (!completion.canWork) {
      track('application_blocked_profile', user.id, { jobId: params.id, missing: completion.missingRequired });
      return NextResponse.json({
        error: 'Complete the required items on your profile before applying for jobs.',
        code: 'PROFILE_INCOMPLETE',
        missing: completion.missingRequired,
      }, { status: 403 });
    }

    // Consumed for correlation only — never trusted for identity
    const body = await req.json().catch(() => ({}));
    const clientRequestId = typeof body?.clientRequestId === 'string' ? body.clientRequestId : undefined;

    const sb = createServerSupabase();

    // Check job exists and is open
    const { data: job } = await sb
      .from('jobs')
      .select('status')
      .eq('id', params.id)
      .single();

    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    if (job.status !== 'open') {
      return NextResponse.json({ error: 'Job is no longer accepting applications' }, { status: 409 });
    }

    // Re-book invitation? The employer already chose this worker — one tap
    // accepts, the application goes straight to 'accepted' and the job
    // starts (in_progress) with no further employer step.
    const { data: existing } = await sb
      .from('applications')
      .select('status')
      .eq('job_id', params.id)
      .eq('worker_id', user.id)
      .maybeSingle();

    if (existing?.status === 'invited') {
      const { error: acceptError } = await sb
        .from('applications')
        .update({ status: 'accepted', applied_at: new Date().toISOString() })
        .eq('job_id', params.id)
        .eq('worker_id', user.id);
      if (acceptError) throw acceptError;

      const { error: startError } = await sb
        .from('jobs')
        .update({ status: 'in_progress' })
        .eq('id', params.id);
      if (startError) throw startError;

      track('applicant_accepted', user.id, { jobId: params.id, via: 'rebook_invite' });
      return NextResponse.json({ success: true, accepted: true, message: 'Invitation accepted — the job has started.' });
    }

    // Snapshot the worker's REAL profile data onto the application
    const { error } = await sb
      .from('applications')
      .upsert(
        {
          job_id: params.id,
          worker_id: user.id,
          worker_name: user.name,
          rating: user.rating ?? null,
          completed_jobs: user.completedJobs ?? 0,
          skills: user.skills ?? [],
          status: 'pending',
          applied_at: new Date().toISOString(),
        },
        { onConflict: 'job_id,worker_id' }
      );

    if (error) throw error;

    track('application_sent', user.id, { jobId: params.id, clientRequestId: clientRequestId ?? null });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[POST /api/jobs/[id]/apply]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
