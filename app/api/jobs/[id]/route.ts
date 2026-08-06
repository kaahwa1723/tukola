import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, mapJob } from '@/lib/supabase-server';
import { getSessionUser } from '@/lib/session';
import { canSeeEmployerPhone } from '@/lib/contact-visibility';

type Params = { params: { id: string } };

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

    // Hard Rule 3: employer phone unlocks only for the employer, admins,
    // or once payment is captured in escrow.
    const viewer = await getSessionUser(req);
    if (!(await canSeeEmployerPhone(sb, data, viewer, req))) {
      job.employerPhone = undefined;
    }

    return NextResponse.json({ job });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** PATCH /api/jobs/[id] — update status or other fields */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const body = await req.json();
    const allowed = ['status', 'description', 'location', 'date_time', 'pay', 'workers_needed', 'images'];
    const updates: Record<string, any> = {};

    // Map camelCase → snake_case
    if (body.status)        updates.status        = body.status;
    if (body.description !== undefined) updates.description = body.description;
    if (body.location)      updates.location      = body.location;
    if (body.dateTime)      updates.date_time     = body.dateTime;
    if (body.pay !== undefined) updates.pay        = body.pay;
    if (body.workersNeeded) updates.workers_needed = body.workersNeeded;
    if (body.images)        updates.images        = body.images;
    if (body.completedAt)   updates.completed_at  = body.completedAt;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const sb = createServerSupabase();
    const { data, error } = await sb
      .from('jobs')
      .update(updates)
      .eq('id', params.id)
      .select('*, applications(*)')
      .single();

    if (error) throw error;

    const job = mapJob(data);
    const viewer = await getSessionUser(req);
    if (!(await canSeeEmployerPhone(sb, data, viewer, req))) {
      job.employerPhone = undefined;
    }

    return NextResponse.json({ job });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** DELETE /api/jobs/[id] — cancel a job */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const sb = createServerSupabase();
    const { error } = await sb
      .from('jobs')
      .update({ status: 'cancelled' })
      .eq('id', params.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
