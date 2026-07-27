import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { getSessionUser } from '@/lib/session';

type Params = { params: { id: string } };

/**
 * POST /api/jobs/[id]/accept
 * Body: { workerId } — which applicant to accept (the employer's choice;
 * this is a selection, not an identity claim).
 *
 * Only the employer who owns the job (per the server session) may accept.
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { workerId } = await req.json();
    if (!workerId) {
      return NextResponse.json({ error: 'workerId is required' }, { status: 400 });
    }

    const sb = createServerSupabase();

    // Ownership guard: only the job's employer may accept an applicant
    const { data: job } = await sb
      .from('jobs')
      .select('employer_id')
      .eq('id', params.id)
      .single();

    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    if (job.employer_id !== user.id) {
      return NextResponse.json({ error: 'Only the employer who posted this job can accept applicants' }, { status: 403 });
    }

    // Accept the chosen applicant
    const { error: appError } = await sb
      .from('applications')
      .update({ status: 'accepted' })
      .eq('job_id', params.id)
      .eq('worker_id', workerId);

    if (appError) throw appError;

    // Set job to in_progress
    const { error: jobError } = await sb
      .from('jobs')
      .update({ status: 'in_progress' })
      .eq('id', params.id);

    if (jobError) throw jobError;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[POST /api/jobs/[id]/accept]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
