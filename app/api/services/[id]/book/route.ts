import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, mapJob } from '@/lib/supabase-server';
import { getSessionUser } from '@/lib/session';
import { track } from '@/lib/analytics';
import { notifyUser } from '@/lib/notify';
import { milestoneTemplate, suggestsMilestones } from '@/lib/pricing';

type Params = { params: { id: string } };

/**
 * POST /api/services/[id]/book — employer books a fundi's listed service.
 *
 * Body: { location, dateTime?, urgency?, notes?, clientRequestId? }
 *
 * This is the Fiverr-style "order" adapted to Tukola: instead of
 * posting a job and waiting for applicants, the employer picks a
 * priced listing. We create the job PRE-FILLED from the listing
 * (title, price, category — the listed price is the agreed price)
 * and invite the fundi, who accepts with one tap via the existing
 * 'invited' path in /api/jobs/[id]/apply. From there the normal
 * held-payment / stage-release machinery takes over unchanged.
 *
 * Lineage: jobs.service_id points back to the listing, so booking
 * conversion is measurable from the database alone.
 *
 * Idempotency: pass clientRequestId to make double-taps safe — the
 * same key reuses jobs.idempotency_key (migration 010).
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const location = String(body.location ?? '').trim();
    if (!location) {
      return NextResponse.json({ error: 'Tell the fundi where the work is (location is required)' }, { status: 400 });
    }
    const clientRequestId = typeof body.clientRequestId === 'string' ? body.clientRequestId : undefined;

    const sb = createServerSupabase();

    // Replay? A double-tap with the same clientRequestId returns the
    // job it already created instead of double-booking.
    if (clientRequestId) {
      const { data: existing } = await sb
        .from('jobs')
        .select('*, applications(*)')
        .eq('idempotency_key', clientRequestId)
        .maybeSingle();
      if (existing) {
        return NextResponse.json({ job: mapJob(existing), idempotent: true });
      }
    }

    // Load the listing + the fundi's current profile snapshot
    const { data: service } = await sb
      .from('worker_services')
      .select('*, profiles!worker_id(id, name, avatar, rating, completed_jobs, skills, blocked)')
      .eq('id', params.id)
      .maybeSingle();

    if (!service || !service.active) {
      return NextResponse.json({ error: 'This service is no longer available' }, { status: 404 });
    }
    const worker = service.profiles as any;
    if (!worker || worker.blocked) {
      return NextResponse.json({ error: 'This fundi is not available right now' }, { status: 409 });
    }
    if (service.worker_id === user.id) {
      return NextResponse.json({ error: 'You cannot book your own service' }, { status: 400 });
    }

    const pay = service.price_ugx as number;
    const pricingType = suggestsMilestones(pay) ? 'milestone' : 'standard';

    const notes = body.notes ? String(body.notes).trim() : '';
    const description = [
      service.description ?? '',
      notes ? `Employer notes: ${notes}` : '',
    ].filter(Boolean).join('\n\n');

    const insertRow: Record<string, unknown> = {
      title: service.title,
      description,
      location,
      date_time: body.dateTime ?? new Date().toISOString(),
      workers_needed: 1,
      pay,
      urgency: body.urgency === 'immediate' ? 'immediate' : 'scheduled',
      status: 'open',
      employer_id: user.id,
      employer_name: user.name,
      employer_phone: user.phone ?? null,
      skills: worker.skills ?? [],
      category: service.category,
      images: [],
      pricing_type: pricingType,
      service_id: service.id,
    };
    if (clientRequestId) insertRow.idempotency_key = clientRequestId;

    let { data: job, error: jobError } = await sb
      .from('jobs')
      .insert(insertRow)
      .select('*, applications(*)')
      .single();

    if (jobError && insertRow.idempotency_key) {
      if (jobError.code === '23505') {
        const { data: winner } = await sb
          .from('jobs')
          .select('*, applications(*)')
          .eq('idempotency_key', insertRow.idempotency_key as string)
          .single();
        if (winner) return NextResponse.json({ job: mapJob(winner), idempotent: true });
      }
      if (jobError.code === 'PGRST204' || jobError.code === '42703') {
        delete insertRow.idempotency_key;
        ({ data: job, error: jobError } = await sb
          .from('jobs')
          .insert(insertRow)
          .select('*, applications(*)')
          .single());
      }
    }
    if (jobError) throw jobError;

    // Stage plan up front for milestone-priced bookings (pay >= 300k)
    if (pricingType === 'milestone') {
      const stages = milestoneTemplate(pay);
      const { error: msError } = await sb.from('job_milestones').insert(
        stages.map((s) => ({
          job_id: job.id, idx: s.idx, label: s.label, pct: s.pct, amount_ugx: s.amountUgx,
        }))
      );
      if (msError) console.error('[book] milestone insert failed', msError);
    }

    // Invite the fundi — one tap accepts and starts the job
    const { error: inviteError } = await sb.from('applications').insert({
      job_id: job.id,
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

    // SMS the fundi — a booking is money waiting; they must know NOW,
    // not next time they open the app. Fire-and-forget.
    notifyUser(sb, worker.id,
      `Tukola: ${user.name} booked you for "${service.title}" — UGX ${Number(pay).toLocaleString()}${service.unit_label ? ` ${service.unit_label}` : ''} in ${location}. Open the Tukola app to accept.`
    ).catch(() => {});

    track('service_booked', user.id, { serviceId: service.id, jobId: job.id, pay, category: service.category });
    return NextResponse.json({
      job: mapJob({ ...job, applications: [] }),
      invitedWorkerName: worker.name,
      message: `${worker.name} has been invited. The job starts the moment they accept.`,
    }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/services/[id]/book]', err);
    return NextResponse.json({ error: 'Could not book this service. Please try again.' }, { status: 500 });
  }
}
