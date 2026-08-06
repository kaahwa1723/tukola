import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

/**
 * GET /api/public-stats — the ONLY numbers the landing page may show.
 * Live counts from the database (Hard Rule 1: no fabricated stats).
 * Small numbers are shown honestly — a real 12 beats a fake 10,000.
 */
export async function GET() {
  try {
    const sb = createServerSupabase();

    const [
      { count: fundis },
      { count: jobsCompleted },
      { data: ratingRows },
    ] = await Promise.all([
      sb.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'worker'),
      sb.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
      sb.from('profiles').select('rating').eq('role', 'worker').not('rating', 'is', null),
    ]);

    const ratings = (ratingRows ?? []).map(r => Number(r.rating));
    const avgRating = ratings.length
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
      : null;

    return NextResponse.json({
      fundis: fundis ?? 0,
      jobsCompleted: jobsCompleted ?? 0,
      avgRating,
    });
  } catch (err: any) {
    console.error('[GET /api/public-stats]', err);
    return NextResponse.json({ error: 'Could not load stats.' }, { status: 500 });
  }
}
