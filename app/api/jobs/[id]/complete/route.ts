import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { getSessionUser } from '@/lib/session';
import { recomputeReliabilityScore } from '@/lib/reliability';

type Params = { params: { id: string } };

/**
 * POST /api/jobs/[id]/complete
 * Body: {} (no identity fields)
 *
 * Marks the job as completed and bumps the accepted worker's completedJobs
 * count. Only the employer who owns the job — per the server session —
 * may complete it.
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const sb = createServerSupabase();
    const completedAt = new Date().toISOString();

    // Verify the job exists and belongs to this employer
    const { data: job, error: fetchError } = await sb
      .from('jobs')
      .select('employer_id')
      .eq('id', params.id)
      .single();

    if (fetchError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    if (job.employer_id !== user.id) {
      return NextResponse.json({ error: 'Only the employer who posted this job can complete it' }, { status: 403 });
    }

    // Mark job completed
    const { error: jobError } = await sb
      .from('jobs')
      .update({ status: 'completed', completed_at: completedAt })
      .eq('id', params.id);

    if (jobError) throw jobError;

    // Increment completed_jobs for the accepted worker (if any)
    const { data: acceptedRows } = await sb
      .from('applications')
      .select('worker_id')
      .eq('job_id', params.id)
      .eq('status', 'accepted')
      .limit(1);

    const workerId = acceptedRows?.[0]?.worker_id;

    if (workerId) {
      // Non-fatal: log and continue on failure
      try {
        const { error: rpcError } = await sb.rpc('increment_completed_jobs', { profile_id: workerId });
        if (rpcError) {
          // RPC not yet created — fall back to manual increment
          const { data: profile } = await sb
            .from('profiles')
            .select('completed_jobs')
            .eq('id', workerId)
            .single();
          if (profile) {
            await sb
              .from('profiles')
              .update({ completed_jobs: (profile.completed_jobs ?? 0) + 1 })
              .eq('id', workerId);
          }
        }
      } catch (e) {
        console.warn('[POST /api/jobs/[id]/complete] completed_jobs bump failed', e);
      }
      // Trust field: a fresh completion moves the reliability score
      await recomputeReliabilityScore(workerId);
    }

    return NextResponse.json({ success: true, completedAt });
  } catch (err: any) {
    console.error('[POST /api/jobs/[id]/complete]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
