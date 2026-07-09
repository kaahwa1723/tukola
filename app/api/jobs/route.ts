import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, mapJob } from '@/lib/supabase-server';

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

    return NextResponse.json({ jobs: (data ?? []).map(mapJob) });
  } catch (err: any) {
    console.error('[GET /api/jobs]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/jobs
 * Body: Job fields (minus id, createdAt, applicants, status)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title, description, location, dateTime, workersNeeded,
      pay, urgency, employerId, employerName, employerPhone,
      skills, images, estimatedHours,
    } = body;

    if (!title || !location || !employerName) {
      return NextResponse.json({ error: 'title, location and employerName are required' }, { status: 400 });
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
        employer_id: employerId,
        employer_name: employerName,
        employer_phone: employerPhone ?? null,
        skills: skills ?? [],
        images: images ?? [],
        estimated_hours: estimatedHours ?? null,
      })
      .select('*, applications(*)')
      .single();

    if (error) throw error;

    return NextResponse.json({ job: mapJob(data) }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/jobs]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
