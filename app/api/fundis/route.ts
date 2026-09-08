import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic'; // live DB search — never prerender

/**
 * GET /api/fundis — location-first fundi search (plan 1.2).
 *
 * Query params:
 *   - area   parish/area text, e.g. "Kololo" (matches profiles.location)
 *   - skill  skill tag filter, e.g. "Plumbing"
 *   - limit  max results (default 20)
 *
 * Ranking is MERIT ONLY — rating (nulls last), then completed jobs.
 * The top 3 are flagged `topRated` so the UI can badge them as premium
 * suggestions. There is no paid placement anywhere in this ranking
 * (Featured Passes are explicitly out of scope in the rebuild plan).
 *
 * Parish-level matching is deliberate: no precise GPS is stored, and a
 * fundi's location is their self-declared work area, not a tracked point.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const area  = searchParams.get('area')?.trim();
    const skill = searchParams.get('skill')?.trim();
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 50);

    const sb = createServerSupabase();
    let query = sb
      .from('profiles')
      .select('id, name, avatar, rating, completed_jobs, skills, location, is_verified, about, reliability_score')
      .eq('role', 'worker')
      .eq('blocked', false)
      .order('rating', { ascending: false, nullsFirst: false })
      .order('completed_jobs', { ascending: false })
      .limit(limit);

    if (area)  query = query.ilike('location', `%${area}%`);
    if (skill) query = query.contains('skills', [skill]);

    const { data, error } = await query;
    if (error) throw error;

    const fundis = (data ?? []).map((r, i) => ({
      id: r.id,
      name: r.name,
      avatar: r.avatar ?? undefined,
      rating: r.rating != null ? Number(r.rating) : undefined,
      completedJobs: r.completed_jobs ?? 0,
      // NULL stays NULL: a fundi with no history is shown as "New",
      // never given a fabricated reliability number
      reliabilityScore: r.reliability_score != null ? Number(r.reliability_score) : undefined,
      skills: r.skills ?? [],
      location: r.location ?? undefined,
      isVerified: r.is_verified ?? false,
      about: r.about ?? '',
      topRated: i < 3 && (r.rating != null || (r.completed_jobs ?? 0) > 0),
    }));

    return NextResponse.json({ fundis, area: area ?? null, skill: skill ?? null });
  } catch (err: any) {
    console.error('[GET /api/fundis]', err);
    return NextResponse.json({ error: 'Could not search fundis.' }, { status: 500 });
  }
}
