import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

type Params = { params: { id: string } };

/**
 * POST /api/jobs/[id]/complete
 * Marks the job as completed and bumps the accepted worker's completedJobs count.
 */
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const sb = createServerSupabase();
    const completedAt = new Date().toISOString();

    // Mark job completed
    const { error: jobError } = await sb
      .from('jobs')
      .update({ status: 'completed', completed_at: completedAt })
      .eq('id', params.id);

    if (jobError) throw jobError;

    // Increment completed_jobs for the accepted worker
    const { data: accepted } = await sb
      .from('applications')
      .select('worker_id')
      .eq('job_id', params.id)
      .eq('status', 'accepted')
      .single();

    if (accepted?.worker_id) {
      const { error: rpcError } = await sb.rpc('increment_completed_jobs', { user_id: accepted.worker_id });
      if (rpcError) {
        // RPC not yet created — fall back to manual increment
        const { data: profile } = await sb
          .from('profiles')
          .select('completed_jobs')
          .eq('id', accepted.worker_id)
          .single();
        if (profile) {
          await sb
            .from('profiles')
            .update({ completed_jobs: (profile.completed_jobs ?? 0) + 1 })
            .eq('id', accepted.worker_id);
        }
      }
    }

    return NextResponse.json({ success: true, completedAt });
  } catch (err: any) {
    console.error('[POST /api/jobs/[id]/complete]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
