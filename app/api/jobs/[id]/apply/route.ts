import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

type Params = { params: { id: string } };

/**
 * POST /api/jobs/[id]/apply
 * Body: { workerId, workerName, rating, completedJobs, skills }
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { workerId, workerName, rating, completedJobs, skills } = await req.json();

    if (!workerId || !workerName) {
      return NextResponse.json({ error: 'workerId and workerName are required' }, { status: 400 });
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

    // Upsert application
    const { error } = await sb
      .from('applications')
      .upsert(
        {
          job_id: params.id,
          worker_id: workerId,
          worker_name: workerName,
          rating: rating ?? 4.5,
          completed_jobs: completedJobs ?? 0,
          skills: skills ?? [],
          status: 'pending',
          applied_at: new Date().toISOString(),
        },
        { onConflict: 'job_id,worker_id' }
      );

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[POST /api/jobs/[id]/apply]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
