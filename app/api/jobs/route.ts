import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, mapJob } from '@/lib/supabase-server';
import { getSessionUser } from '@/lib/session';
import { canSeeEmployerPhoneInList } from '@/lib/contact-visibility';
import { track } from '@/lib/analytics';

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
 * Body: Job fields (minus id, createdAt, applicants, status)
 *
 * Employer identity comes from the server session — client-supplied
 * employerId / employerName / employerPhone are ignored.
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
    } = body;

    if (!title || !location) {
      return NextResponse.json({ error: 'title and location are required' }, { status: 400 });
    }

    const sb = createServerSupabase();
    const { data, error } = await sb
      .from('jobs')
      .insert({
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
      })
      .select('*, applications(*)')
      .single();

    if (error) throw error;

    track('job_posted', user.id, { jobId: data.id, pay: pay ?? null, urgency: urgency ?? 'scheduled', category: category ?? null });
    return NextResponse.json({ job: mapJob(data) }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/jobs]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
