import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, mapJob } from '@/lib/supabase-server';
import { getSessionUser } from '@/lib/session';
import { track } from '@/lib/analytics';
import { notifyUser } from '@/lib/notify';
import { randomUUID } from 'node:crypto';

type Params = { params: { id: string } };

/**
 * POST /api/jobs/[id]/rebook
 * Body: {} (no fields — everything comes from the original job + session)
 *
 * "Book the same fundi again" — the retention engine. One tap for the
 * employer: clones their COMPLETED job into a fresh one and invites the
 * same worker back. The worker then accepts the invitation with one tap
 * (see the 'invited' path in /apply), which moves the job straight to
 * in_progress — no re-negotiation, no off-platform detour.
 *
 * Lineage is stored in jobs.rebook_of_job_id so repeat-hire behavior is
 * measurable from the database alone.
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const sb = createServerSupabase();

    // Load the original job; only its employer can re-book it
    const { data: original } = await sb
      .from('jobs')
      .select('*')
      .eq('id', params.id)
      .maybeSingle();

    if (!original) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    if (original.employer_id !== user.id) {
      return NextResponse.json({ error: 'Only the employer who posted this job can re-book it' }, { status: 403 });
    }
    if (original.status !== 'completed') {
      return NextResponse.json({ error: 'You can only re-book from a completed job' }, { status: 409 });
    }

    // The fundi to invite back = the worker who was accepted last time
    const { data: accepted } = await sb
      .from('applications')
      .select('worker_id')
      .eq('job_id', params.id)
      .eq('status', 'accepted')
      .limit(1);
    const workerId = accepted?.[0]?.worker_id;
    if (!workerId) {
      return NextResponse.json({ error: 'No worker was assigned to the original job' }, { status: 409 });
    }

    // Clone the job (date resets to now; employer edits details after)
    const newJobId = `job_${randomUUID()}`;
    const { data: newJob, error: jobError } = await sb
      .from('jobs')
      .insert({
        id: newJobId,
        title: original.title,
        description: original.description ?? '',
        location: original.location,
        date_time: new Date().toISOString(),
        workers_needed: 1,
        pay: original.pay ?? null,
        urgency: original.urgency ?? 'scheduled',
        status: 'open',
        employer_id: user.id,
        employer_name: user.name,
        employer_phone: user.phone ?? null,
        skills: original.skills ?? [],
        category: original.category ?? null,
        images: [],
        estimated_hours: original.estimated_hours ?? null,
        rebook_of_job_id: original.id,
        created_at: new Date().toISOString(),
      })
      .select('*, applications(*)')
      .single();

    if (jobError) throw jobError;

    // Invite the same fundi — snapshot their REAL current profile data
    const { data: worker } = await sb
      .from('profiles')
      .select('id, name, avatar, rating, completed_jobs, skills')
      .eq('id', workerId)
      .single();
    if (!worker) {
      return NextResponse.json({ error: 'The original fundi no longer has an account' }, { status: 409 });
    }

    const { error: inviteError } = await sb
      .from('applications')
      .insert({
        job_id: newJobId,
        worker_id: worker.id,
        worker_name: worker.name,
        worker_avatar: worker.avatar ?? null,
        rating: worker.rating ?? null,
        completed_jobs: worker.completed_jobs ?? 0,
        skills: worker.skills ?? [],
        status: 'invited',
        applied_at: new Date().toISOString(),
      });

    if (inviteError) throw inviteError;

    // SMS the fundi about the re-book invite — fire-and-forget.
    notifyUser(sb, worker.id,
      `Tukola: ${user.name} wants to book you again for "${original.title}"${original.pay ? ` — UGX ${Number(original.pay).toLocaleString()}` : ''} in ${original.location}. Open the Tukola app to accept.`
    ).catch(() => {});

    track('job_posted', user.id, { jobId: newJobId, rebookOf: original.id, pay: original.pay ?? null });
    return NextResponse.json({
      job: mapJob({ ...newJob, applications: [] }),
      invitedWorkerName: worker.name,
      message: `${worker.name} has been invited back. The job starts the moment they accept.`,
    }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/jobs/[id]/rebook]', err);
    return NextResponse.json({ error: 'Could not re-book this job. Please try again.' }, { status: 500 });
  }
}
