import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { getSessionUser } from '@/lib/session';

type Params = { params: { id: string } };

const PHOTO_REQUIRED_ABOVE_UGX = 100_000;

/**
 * POST /api/jobs/[id]/mark-done
 * Body: { photoUrl? }
 *
 * TAP 1 of the two-tap completion flow: the ACCEPTED worker declares the
 * job done. A photo of the completed work is required for jobs above
 * UGX 100,000. This starts the 48h auto-release clock — the employer then
 * either confirms (release) or disputes.
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { photoUrl } = await req.json().catch(() => ({}));
    const sb = createServerSupabase();

    const { data: job } = await sb
      .from('jobs')
      .select('id, employer_id, status, pay, worker_done_at')
      .eq('id', params.id)
      .maybeSingle();

    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    if (job.worker_done_at) {
      // Idempotent tap — already marked done
      return NextResponse.json({ success: true, workerDoneAt: job.worker_done_at, alreadyDone: true });
    }

    // Only the accepted worker can declare the job done
    const { data: accepted } = await sb
      .from('applications')
      .select('worker_id')
      .eq('job_id', params.id)
      .eq('status', 'accepted')
      .limit(1);
    if (!accepted?.length || accepted[0].worker_id !== user.id) {
      return NextResponse.json({ error: 'Only the worker assigned to this job can mark it done' }, { status: 403 });
    }

    // Photo-of-completed-work is required for jobs above UGX 100K
    if ((job.pay ?? 0) > PHOTO_REQUIRED_ABOVE_UGX && !photoUrl) {
      return NextResponse.json(
        { error: 'A photo of the completed work is required for jobs above UGX 100,000' },
        { status: 400 }
      );
    }

    const workerDoneAt = new Date().toISOString();
    const { error } = await sb
      .from('jobs')
      .update({
        worker_done_at: workerDoneAt,
        completion_photo_url: photoUrl ?? null,
      })
      .eq('id', params.id);
    if (error) throw error;

    return NextResponse.json({
      success: true,
      workerDoneAt,
      autoReleaseAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      message: 'The employer has been asked to confirm. If they do nothing, escrow releases automatically in 48 hours.',
    });
  } catch (err: any) {
    console.error('[POST /api/jobs/[id]/mark-done]', err);
    return NextResponse.json({ error: 'Could not mark the job done. Please try again.' }, { status: 500 });
  }
}
