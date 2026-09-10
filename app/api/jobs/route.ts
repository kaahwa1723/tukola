import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, mapJob } from '@/lib/supabase-server';
import { getSessionUser } from '@/lib/session';
import { canSeeEmployerPhoneInList } from '@/lib/contact-visibility';
import { track } from '@/lib/analytics';
import { milestoneTemplate, suggestsMilestones, type PricingType } from '@/lib/pricing';

/**
 * GET /api/jobs
 * Query params:
 *   - status       filter by job status (default: open)
 *   - employerId   return only this employer's jobs
 *   - skill        filter by skill tag
 *   - limit        max results (default 50)
 *   - offset       pagination offset
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const status     = searchParams.get('status') ?? 'open';
    const employerId = searchParams.get('employerId');
    const skill      = searchParams.get('skill');
    const limit      = parseInt(searchParams.get('limit') ?? '50');
    const offset     = parseInt(searchParams.get('offset') ?? '0');

    const sb = createServerSupabase();
    let query = sb
      .from('jobs')
      .select('*, applications(*)')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status !== 'all') query = query.eq('status', status);
    if (employerId)        query = query.eq('employer_id', employerId);
    if (skill)             query = query.contains('skills', [skill]);

    const { data, error } = await query;
    if (error) throw error;

    // Hard Rule 3: strip employer phones in list views for everyone
    // except the employer themselves and admins (detail view runs the
    // full escrow check).
    const viewer = await getSessionUser(req);
    const jobs = (data ?? []).map(row => {
      const job = mapJob(row);
      if (!canSeeEmployerPhoneInList(row, viewer, req)) {
        job.employerPhone = undefined;
        // Applicant identities belong to the employer's hiring pipeline;
        // a worker sees only their own application
        job.applicants = viewer ? job.applicants.filter(a => a.workerId === viewer.id) : [];
      }
      return job;
    });

    return NextResponse.json({ jobs });
  } catch (err: any) {
    console.error('[GET /api/jobs]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/jobs
 * Body: Job fields (minus id, createdAt, applicants, status) + optional
 *       clientRequestId (idempotency key from the offline outbox).
 *
 * Employer identity comes from the server session — client-supplied
 * employerId / employerName / employerPhone are ignored.
 *
 * Idempotency: when clientRequestId is present it is stored in
 * jobs.idempotency_key (unique, migration 010). A replayed submission —
 * offline-outbox flush or double-tap — returns the existing job instead
 * of creating a duplicate.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await req.json();
    const {
      title, description, location, dateTime, workersNeeded,
      pay, urgency, skills, category, images, estimatedHours,
      pricingType,
      clientRequestId,
    } = body;

    if (!title || !location) {
      return NextResponse.json({ error: 'title and location are required' }, { status: 400 });
    }

    // Stage payments only make sense with a known amount at/above the
    // threshold; anything else silently falls back to standard.
    const wantsMilestones =
      pricingType === 'milestone' &&
      typeof pay === 'number' &&
      suggestsMilestones(pay);
    const finalPricingType: PricingType = wantsMilestones ? 'milestone' : 'standard';

    const sb = createServerSupabase();

    // Replay? Return the job this clientRequestId already created.
    if (clientRequestId && typeof clientRequestId === 'string') {
      const { data: existing, error: lookupError } = await sb
        .from('jobs')
        .select('*, applications(*)')
        .eq('idempotency_key', clientRequestId)
        .maybeSingle();
      // PGRST204/42703: migration 010 not applied yet — degrade to
      // non-deduped insert rather than failing the post.
      if (!lookupError && existing) {
        return NextResponse.json({ job: mapJob(existing), idempotent: true });
      }
    }

    const insertRow: Record<string, unknown> = {
      title,
      description: description ?? '',
      location,
      date_time: dateTime ?? new Date().toISOString(),
      workers_needed: workersNeeded ?? 1,
      pay: pay ?? null,
      urgency: urgency ?? 'scheduled',
      status: 'open',
      employer_id: user.id,
      employer_name: user.name,
      employer_phone: user.phone ?? null,
      skills: skills ?? [],
      category: category ?? null,
      images: images ?? [],
      estimated_hours: estimatedHours ?? null,
      pricing_type: finalPricingType,
    };
    if (clientRequestId && typeof clientRequestId === 'string') {
      insertRow.idempotency_key = clientRequestId;
    }

    let { data, error } = await sb
      .from('jobs')
      .insert(insertRow)
      .select('*, applications(*)')
      .single();

    if (error && insertRow.idempotency_key) {
      if (error.code === '23505') {
        // Unique idempotency_key: a concurrent replay won the race
        const { data: winner } = await sb
          .from('jobs')
          .select('*, applications(*)')
          .eq('idempotency_key', insertRow.idempotency_key as string)
          .single();
        if (winner) {
          return NextResponse.json({ job: mapJob(winner), idempotent: true });
        }
      }
      if (error.code === 'PGRST204' || error.code === '42703' || /idempotency_key/.test(error.message ?? '')) {
        // Column not yet migrated — insert without it rather than fail
        delete insertRow.idempotency_key;
        ({ data, error } = await sb
          .from('jobs')
          .insert(insertRow)
          .select('*, applications(*)')
          .single());
      }
    }
    if (error) throw error;

    // Milestone jobs get their stage plan written up front; each stage
    // is funded and released separately via /api/payments?milestoneIdx.
    if (finalPricingType === 'milestone') {
      const stages = milestoneTemplate(pay);
      const { error: msError } = await sb.from('job_milestones').insert(
        stages.map((s) => ({
          job_id: data.id,
          idx: s.idx,
          label: s.label,
          pct: s.pct,
          amount_ugx: s.amountUgx,
        }))
      );
      if (msError) {
        console.error('[POST /api/jobs] milestone insert failed', msError);
      }
    }

    track('job_posted', user.id, { jobId: data.id, pay: pay ?? null, urgency: urgency ?? 'scheduled', category: category ?? null });
    return NextResponse.json({ job: mapJob(data) }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/jobs]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
