import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

type Params = { params: { id: string } };

/**
 * POST /api/jobs/[id]/accept
 * Body: { workerId }
 * Accepts the given worker's application and sets job status to in_progress.
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { workerId } = await req.json();

    if (!workerId) {
      return NextResponse.json({ error: 'workerId is required' }, { status: 400 });
    }

    const sb = createServerSupabase();

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
