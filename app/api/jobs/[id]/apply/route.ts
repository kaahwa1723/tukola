import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { getSessionUser } from '@/lib/session';
import { track } from '@/lib/analytics';

type Params = { params: { id: string } };

/**
 * POST /api/jobs/[id]/apply
 * Body: {} (no identity fields)
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

    track('application_sent', user.id, { jobId: params.id });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[POST /api/jobs/[id]/apply]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
