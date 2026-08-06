import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { getSessionUser } from '@/lib/session';
import { track } from '@/lib/analytics';

/**
 * POST /api/ratings
 * Body: { jobId, targetId, stars, comment? }
 *   stars: 1–5 int (preferred)
 * Legacy body also accepted: { jobId, toId, score, comment? }
 *   score: 'great' | 'issues'
 *
 * The rater is always the SESSION user (client fromId is ignored), and
 * they must be a party to a COMPLETED job (its employer or its accepted
 * worker) — a rating now requires a completed job by construction.
 *
 * The legacy `score` column is always written for back-compat
 * ('great' when stars >= 4, else 'issues'). The recipient's profile rating
 * is recomputed as the average of `stars` across their ratings, falling back
 * to the old score-based logic for rows without stars.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await req.json();
    const { jobId, comment } = body;
    const fromId = user.id;
    const toId = body.targetId ?? body.toId;
    let { stars, score } = body;

    if (!jobId || !toId) {
      return NextResponse.json({ error: 'jobId and targetId are required' }, { status: 400 });
    }

    if (stars !== undefined && stars !== null) {
      stars = Number(stars);
      if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
        return NextResponse.json({ error: 'stars must be an integer between 1 and 5' }, { status: 400 });
      }
      score = stars >= 4 ? 'great' : 'issues';
    } else {
      stars = null;
      if (!['great', 'issues'].includes(score)) {
        return NextResponse.json({ error: 'score must be "great" or "issues"' }, { status: 400 });
      }
    }

    const sb = createServerSupabase();

    // Layer 4 ownership guard: rater must be a party to a completed job,
    // and the target must be the other party.
    const { data: job } = await sb
      .from('jobs')
      .select('employer_id, status')
      .eq('id', jobId)
      .maybeSingle();

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    if (job.status !== 'completed') {
      return NextResponse.json({ error: 'You can only rate a completed job' }, { status: 409 });
    }

    let workerId: string | null = null;
    if (job.employer_id === fromId) {
      const { data: accepted } = await sb
        .from('applications')
        .select('worker_id')
        .eq('job_id', jobId)
        .eq('status', 'accepted')
        .limit(1);
      workerId = accepted?.[0]?.worker_id ?? null;
    } else {
      const { data: mine } = await sb
        .from('applications')
        .select('worker_id')
        .eq('job_id', jobId)
        .eq('worker_id', fromId)
        .eq('status', 'accepted')
        .limit(1);
      if (mine?.length) workerId = fromId;
    }

    const isEmployer = job.employer_id === fromId;
    const isAcceptedWorker = workerId === fromId;
    if (!isEmployer && !isAcceptedWorker) {
      return NextResponse.json({ error: 'Only the job parties can rate this job' }, { status: 403 });
    }

    const expectedTarget = isEmployer ? workerId : job.employer_id;
    if (!expectedTarget || toId !== expectedTarget) {
      return NextResponse.json({ error: 'You can only rate the other party of this job' }, { status: 403 });
    }

    // Upsert rating (one per job per reviewer)
    const { error: ratingError } = await sb
      .from('ratings')
      .upsert(
        { job_id: jobId, from_id: fromId, to_id: toId, score, stars, comment: comment ?? null },
        { onConflict: 'job_id,from_id' }
      );

    if (ratingError) throw ratingError;

    track('rating_submitted', fromId, { jobId, targetId: toId, stars, score });

    // Update the recipient's rolling average rating
    const { data: allRatings } = await sb
      .from('ratings')
      .select('score, stars')
      .eq('to_id', toId);

    if (allRatings && allRatings.length > 0) {
      const hasStars = allRatings.some(r => typeof r.stars === 'number');
      let newRating: number;

      if (hasStars) {
        // Average stars; legacy rows without stars contribute their score-based equivalent
        const sum = allRatings.reduce(
          (acc, r) => acc + (typeof r.stars === 'number' ? r.stars : r.score === 'great' ? 5 : 3),
          0
        );
        newRating = sum / allRatings.length;
      } else {
        // Legacy score-based computation
        const greatCount = allRatings.filter(r => r.score === 'great').length;
        const ratio      = greatCount / allRatings.length;           // 0..1
        newRating        = 3.0 + ratio * 2.0;                        // maps to 3.0..5.0
      }

      await sb
        .from('profiles')
        .update({ rating: Math.round(newRating * 10) / 10 })
        .eq('id', toId);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[POST /api/ratings]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** GET /api/ratings?userId=xxx — fetch all ratings received by a user */
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const sb = createServerSupabase();
    const { data, error } = await sb
      .from('ratings')
      .select('*')
      .eq('to_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ ratings: data ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
