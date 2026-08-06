import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { getSessionUser } from '@/lib/session';
import { randomUUID } from 'node:crypto';

/**
 * POST /api/recurring — create a recurring booking template.
 * Body: { jobId, frequency: 'weekly' | 'biweekly', dayOfWeek: 0-6 }
 *
 * Created from one of the employer's COMPLETED jobs with an accepted
 * worker. A cron (/api/cron/recurring) then generates a fresh job +
 * invited application for the same fundi on every due date. Payment is
 * per-instance — Uganda MoMo has no auto-debit, every debit needs a PIN.
 *
 * GET /api/recurring — list the session employer's templates.
 */

function nextOccurrence(dayOfWeek: number, fromDate: Date): string {
  const d = new Date(fromDate);
  d.setHours(0, 0, 0, 0);
  const delta = (dayOfWeek - d.getDay() + 7) % 7 || 7; // always in the future
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { jobId, frequency, dayOfWeek } = await req.json();
    if (!jobId || !['weekly', 'biweekly'].includes(frequency) ||
        !Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      return NextResponse.json(
        { error: 'jobId, frequency (weekly|biweekly) and dayOfWeek (0-6) are required' },
        { status: 400 }
      );
    }

    const sb = createServerSupabase();

    const { data: job } = await sb
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .maybeSingle();
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    if (job.employer_id !== user.id) {
      return NextResponse.json({ error: 'Only the employer who posted this job can make it recurring' }, { status: 403 });
    }
    if (job.status !== 'completed') {
      return NextResponse.json({ error: 'Recurring bookings start from a completed job' }, { status: 409 });
    }

    const { data: accepted } = await sb
      .from('applications')
      .select('worker_id')
      .eq('job_id', jobId)
      .eq('status', 'accepted')
      .limit(1);
    const workerId = accepted?.[0]?.worker_id;
    if (!workerId) {
      return NextResponse.json({ error: 'No worker was assigned to the original job' }, { status: 409 });
    }

    // One active template per employer+worker+title — re-creating returns it
    const { data: existing } = await sb
      .from('recurring_templates')
      .select('*')
      .eq('employer_id', user.id)
      .eq('worker_id', workerId)
      .eq('title', job.title)
      .eq('active', true)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ template: existing, idempotent: true });
    }

    const { data: template, error } = await sb
      .from('recurring_templates')
      .insert({
        id: `rec_${randomUUID()}`,
        employer_id: user.id,
        worker_id: workerId,
        title: job.title,
        description: job.description ?? '',
        location: job.location,
        pay: job.pay ?? null,
        skills: job.skills ?? [],
        category: job.category ?? null,
        frequency,
        day_of_week: dayOfWeek,
        next_run_on: nextOccurrence(dayOfWeek, new Date()),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ template }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/recurring]', err);
    return NextResponse.json({ error: 'Could not create the recurring booking.' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const sb = createServerSupabase();
    const { data, error } = await sb
      .from('recurring_templates')
      .select('*, worker:profiles!recurring_templates_worker_id_fkey(name)')
      .eq('employer_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ templates: data ?? [] });
  } catch (err: any) {
    console.error('[GET /api/recurring]', err);
    return NextResponse.json({ error: 'Could not load recurring bookings.' }, { status: 500 });
  }
}
