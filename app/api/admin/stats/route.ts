import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

/** GET /api/admin/stats — real platform counts */
export async function GET() {
  try {
    const sb = createServerSupabase();

    const [
      { count: totalUsers },
      { count: totalWorkers },
      { count: totalEmployers },
      { count: totalJobs },
      { count: openJobs },
      { count: activeJobs },
      { count: completedJobs },
    ] = await Promise.all([
      sb.from('profiles').select('*', { count: 'exact', head: true }),
      sb.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'worker'),
      sb.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'employer'),
      sb.from('jobs').select('*', { count: 'exact', head: true }),
      sb.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'open'),
      sb.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
      sb.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    ]);

    return NextResponse.json({
      totalUsers:    totalUsers    ?? 0,
      totalWorkers:  totalWorkers  ?? 0,
      totalEmployers:totalEmployers?? 0,
      totalJobs:     totalJobs     ?? 0,
      openJobs:      openJobs      ?? 0,
      activeJobs:    activeJobs    ?? 0,
      completedJobs: completedJobs ?? 0,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
