import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { isCronAuthorized } from '@/lib/cron-auth';
import { track } from '@/lib/analytics';
import { randomUUID } from 'node:crypto';

/**
 * GET /api/cron/recurring
 *
 * Generates job instances for due recurring templates: clones the
 * template into a fresh open job and invites the same fundi (status
 * 'invited' — they accept with one tap, reusing the re-book flow).
 * Advances next_run_on by the template interval, keeping the schedule
 * aligned to the original day even if a run is missed.
 *
 * Secured by the CRON_SECRET header — schedule daily (Vercel Cron or an
 * external scheduler).
 */
export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const sb = createServerSupabase();
    const today = new Date().toISOString().slice(0, 10);

    const { data: due } = await sb
      .from('recurring_templates')
      .select('*')
      .eq('active', true)
      .lte('next_run_on', today);

    const results: { templateId: string; jobId?: string; skipped?: string }[] = [];

    for (const t of due ?? []) {
      try {
        // Employer + worker must still exist and be active
        const [{ data: employer }, { data: worker }] = await Promise.all([
          sb.from('profiles').select('id, name, phone, blocked').eq('id', t.employer_id).single(),
          sb.from('profiles').select('id, name, avatar, rating, completed_jobs, skills, blocked').eq('id', t.worker_id).single(),
        ]);
        if (!employer || employer.blocked || !worker || worker.blocked) {
          await sb.from('recurring_templates').update({ active: false }).eq('id', t.id);
          results.push({ templateId: t.id, skipped: 'party missing or blocked — template paused' });
          continue;
        }

        // Create the job instance
        const jobId = `job_${randomUUID()}`;
        const now = new Date().toISOString();
        const { error: jobError } = await sb.from('jobs').insert({
          id: jobId,
          title: t.title,
          description: t.description ?? '',
          location: t.location,
          date_time: `${t.next_run_on}T08:00:00.000Z`,
          workers_needed: 1,
          pay: t.pay ?? null,
          urgency: 'scheduled',
          status: 'open',
          employer_id: t.employer_id,
          employer_name: employer.name,
          employer_phone: employer.phone ?? null,
          skills: t.skills ?? [],
          category: t.category ?? null,
          images: [],
          created_at: now,
        });
        if (jobError) throw jobError;

        // Invite the same fundi
        const { error: inviteError } = await sb.from('applications').insert({
          job_id: jobId,
          worker_id: worker.id,
          worker_name: worker.name,
          worker_avatar: worker.avatar ?? null,
          rating: worker.rating ?? null,
          completed_jobs: worker.completed_jobs ?? 0,
          skills: worker.skills ?? [],
          status: 'invited',
          applied_at: now,
        });
        if (inviteError) throw inviteError;

        // Advance the schedule (aligned to the original weekday)
        const intervalDays = t.frequency === 'weekly' ? 7 : 14;
        const next = new Date(`${t.next_run_on}T00:00:00.000Z`);
        next.setDate(next.getDate() + intervalDays);
        await sb
          .from('recurring_templates')
          .update({ next_run_on: next.toISOString().slice(0, 10), last_generated_job_id: jobId })
          .eq('id', t.id);

        track('job_posted', t.employer_id, { jobId, via: 'recurring', templateId: t.id, pay: t.pay ?? null });
        results.push({ templateId: t.id, jobId });
      } catch (e: any) {
        console.error(`[cron/recurring] template ${t.id} failed:`, e.message);
        results.push({ templateId: t.id, skipped: e.message });
      }
    }

    return NextResponse.json({ processed: (due ?? []).length, results });
  } catch (err: any) {
    console.error('[cron/recurring]', err);
    return NextResponse.json({ error: 'Recurring generation failed.' }, { status: 500 });
  }
}
