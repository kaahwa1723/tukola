import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { isAdmin } from '@/lib/admin-auth';

/**
 * GET /api/admin/charts
 *
 * Data for the admin graphs — every number is a live database query.
 * Returns:
 *   signupsByDay      last 30 days, per day: workers / employers who joined
 *   jobsByDay         last 30 days, per day: jobs posted, split by their
 *                     current status (open / in_progress / completed / cancelled)
 *   jobsByCategory    all-time job count per category/trade
 *   sexDistribution   all-time user count by sex (male / female / not shared)
 */
const DAY_MS = 24 * 60 * 60 * 1000;

function dayKey(iso: string): string {
  // YYYY-MM-DD in server local time — stable bucket key for grouping
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function GET(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const sb = createServerSupabase();
    const since = new Date(Date.now() - 30 * DAY_MS).toISOString();

    const [
      { data: recentProfiles, error: pErr },
      { data: recentJobs, error: jErr },
      { data: allJobs, error: ajErr },
      { data: allProfiles, error: apErr },
    ] = await Promise.all([
      sb.from('profiles').select('created_at, role').gte('created_at', since),
      sb.from('jobs').select('created_at, status').gte('created_at', since),
      sb.from('jobs').select('category'),
      sb.from('profiles').select('sex'),
    ]);
    if (pErr) throw pErr;
    if (jErr) throw jErr;
    if (ajErr) throw ajErr;
    if (apErr) throw apErr;

    // ── Signups per day (last 30 days) ──────────────────────────────────────
    const signupBuckets = new Map<string, { date: string; workers: number; employers: number }>();
    for (let i = 29; i >= 0; i--) {
      const key = dayKey(new Date(Date.now() - i * DAY_MS).toISOString());
      signupBuckets.set(key, { date: key, workers: 0, employers: 0 });
    }
    (recentProfiles ?? []).forEach(p => {
      const bucket = signupBuckets.get(dayKey(p.created_at));
      if (!bucket) return;
      if (p.role === 'worker') bucket.workers += 1;
      else if (p.role === 'employer') bucket.employers += 1;
    });
    const signupsByDay = Array.from(signupBuckets.values());

    // ── Jobs posted per day, split by current status ────────────────────────
    const jobBuckets = new Map<string, { date: string; open: number; in_progress: number; completed: number; cancelled: number }>();
    for (let i = 29; i >= 0; i--) {
      const key = dayKey(new Date(Date.now() - i * DAY_MS).toISOString());
      jobBuckets.set(key, { date: key, open: 0, in_progress: 0, completed: 0, cancelled: 0 });
    }
    (recentJobs ?? []).forEach(j => {
      const bucket = jobBuckets.get(dayKey(j.created_at));
      if (!bucket) return;
      const status = (j.status ?? 'open') as 'open' | 'in_progress' | 'completed' | 'cancelled';
      if (status in bucket) bucket[status] += 1;
      else bucket.open += 1;
    });
    const jobsByDay = Array.from(jobBuckets.values());

    // ── Jobs by category / trade (all time) ─────────────────────────────────
    const categoryCounts = new Map<string, number>();
    (allJobs ?? []).forEach(j => {
      const cat = (j.category ?? '').trim() || 'Not specified';
      categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1);
    });
    const jobsByCategory = Array.from(categoryCounts.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    // ── Sex distribution of all users ───────────────────────────────────────
    let male = 0, female = 0, notShared = 0;
    (allProfiles ?? []).forEach(p => {
      if (p.sex === 'male') male += 1;
      else if (p.sex === 'female') female += 1;
      else notShared += 1;
    });

    return NextResponse.json({
      signupsByDay,
      jobsByDay,
      jobsByCategory,
      sexDistribution: { male, female, notShared },
    });
  } catch (err: any) {
    console.error('[GET /api/admin/charts]', err);
    return NextResponse.json({ error: 'Could not load chart data.' }, { status: 500 });
  }
}
