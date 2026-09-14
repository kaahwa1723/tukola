import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, mapJob } from '@/lib/supabase-server';
import { getSessionUser } from '@/lib/session';
import { canSeeEmployerPhone } from '@/lib/contact-visibility';
import { isAdmin } from '@/lib/admin-auth';
import { recomputeReliabilityScore } from '@/lib/reliability';

type Params = { params: { id: string } };

/** A cancelled job that had an accepted worker is a "collapsed booking"
    signal for that fundi's reliability score (see lib/reliability.ts). */
async function recomputeAcceptedWorkerReliability(
  sb: ReturnType<typeof createServerSupabase>,
  jobId: string
) {
  const { data: accepted } = await sb
    .from('applications')
    .select('worker_id')
    .eq('job_id', jobId)
    .eq('status', 'accepted')
    .limit(1);
  if (accepted?.[0]?.worker_id) {
    await recomputeReliabilityScore(accepted[0].worker_id);
  }
}

/** GET /api/jobs/[id] — fetch single job with applicants */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const sb = createServerSupabase();
    const { data, error } = await sb
      .from('jobs')
      .select('*, applications(*)')
      .eq('id', params.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const job = mapJob(data);
    const viewer = await getSessionUser(req);

    // Hard Rule 3: employer phone unlocks only for the employer, admins,
    // or once payment is captured in escrow.
    if (!(await canSeeEmployerPhone(sb, data, viewer, req))) {
      job.employerPhone = undefined;
    }

    // Applicant identities are the employer's private hiring pipeline —
    // visible to the job's employer and admins only. A worker sees only
    // their OWN application (needed for the re-book invite accept flow).
    if (!isAdmin(req) && (!viewer || viewer.id !== data.employer_id)) {
      job.applicants = viewer ? job.applicants.filter(a => a.workerId === viewer.id) : [];
    }

    return NextResponse.json({ job });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** PATCH /api/jobs/[id] — update fields. Employer (owner) or admin only. */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await getSessionUser(req);
    const admin = isAdmin(req);
    if (!user && !admin) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await req.json();
    const updates: Record<string, any> = {};

    // Map camelCase → snake_case
    if (body.status)        updates.status        = body.status;
    if (body.title)         updates.title         = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.location)      updates.location      = body.location;
    if (body.dateTime)      updates.date_time     = body.dateTime;
    if (body.pay !== undefined) updates.pay        = body.pay;
    if (body.workersNeeded) updates.workers_needed = body.workersNeeded;
    if (body.urgency)       updates.urgency       = body.urgency;
    if (body.category !== undefined) updates.category = body.category;
    if (body.images)        updates.images        = body.images;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Status transitions do NOT go through this generic route: 'completed'
    // is set only by the completion/release flow. Here an employer may
    // only cancel.
    if (updates.status && updates.status !== 'cancelled') {
      return NextResponse.json(
        { error: 'Status can only be changed to cancelled here' },
        { status: 400 }
      );
    }
    if (updates.pay !== undefined && (typeof updates.pay !== 'number' || updates.pay <= 0)) {
      return NextResponse.json({ error: 'pay must be a positive number' }, { status: 400 });
    }
    if (updates.workers_needed !== undefined && updates.workers_needed < 1) {
      return NextResponse.json({ error: 'workersNeeded must be at least 1' }, { status: 400 });
    }
    if (updates.urgency && !['immediate', 'scheduled'].includes(updates.urgency)) {
      return NextResponse.json({ error: 'Invalid urgency' }, { status: 400 });
    }

    const sb = createServerSupabase();

    // Ownership: only the employer who posted the job (or an admin)
    const { data: existing } = await sb
      .from('jobs')
      .select('employer_id, status')
      .eq('id', params.id)
      .maybeSingle();
    if (!existing) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    if (!admin && (!user || existing.employer_id !== user.id)) {
      return NextResponse.json({ error: 'Only the employer who posted this job can edit it' }, { status: 403 });
    }
    // Field edits only while the job is still open; cancellation is allowed
    // until the job is completed.
    const editingFields = Object.keys(updates).some(k => k !== 'status');
    if (editingFields && existing.status !== 'open') {
      return NextResponse.json({ error: 'Only open jobs can be edited' }, { status: 409 });
    }
    if (existing.status === 'completed' || existing.status === 'cancelled') {
      return NextResponse.json({ error: `This job is already ${existing.status}` }, { status: 409 });
    }
    // Cancelling a job with money captured in escrow must go through the
    // dispute/refund flow — never a silent edit.
    if (updates.status === 'cancelled') {
      const { count } = await sb
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('job_id', params.id)
        .in('status', ['held', 'disputed']);
      if ((count ?? 0) > 0) {
        return NextResponse.json(
          { error: 'This job has money in escrow — open a dispute to cancel and refund' },
          { status: 409 }
        );
      }
    }

    const { data, error } = await sb
      .from('jobs')
      .update(updates)
      .eq('id', params.id)
      .select('*, applications(*)')
      .single();

    if (error) throw error;

    if (updates.status === 'cancelled') {
      await recomputeAcceptedWorkerReliability(sb, params.id);
    }

    const job = mapJob(data);
    if (!(await canSeeEmployerPhone(sb, data, user, req))) {
      job.employerPhone = undefined;
    }
    if (!admin && (!user || data.employer_id !== user.id)) {
      job.applicants = user ? job.applicants.filter(a => a.workerId === user.id) : [];
    }

    return NextResponse.json({ job });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** DELETE /api/jobs/[id] — cancel a job. Employer (owner) or admin only. */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const user = await getSessionUser(req);
    const admin = isAdmin(req);
    if (!user && !admin) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const sb = createServerSupabase();
    const { data: job } = await sb
      .from('jobs')
      .select('employer_id, status')
      .eq('id', params.id)
      .maybeSingle();
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    if (!admin && (!user || job.employer_id !== user.id)) {
      return NextResponse.json({ error: 'Only the employer who posted this job can cancel it' }, { status: 403 });
    }
    if (job.status === 'completed' || job.status === 'cancelled') {
      return NextResponse.json({ error: `This job is already ${job.status}` }, { status: 409 });
    }
    // Escrow safety: money in escrow requires the dispute/refund flow
    const { count } = await sb
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .eq('job_id', params.id)
      .in('status', ['held', 'disputed']);
    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { error: 'This job has money in escrow — open a dispute to cancel and refund' },
        { status: 409 }
      );
    }

    const { error } = await sb
      .from('jobs')
      .update({ status: 'cancelled' })
      .eq('id', params.id);

    if (error) throw error;

    await recomputeAcceptedWorkerReliability(sb, params.id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
