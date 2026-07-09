import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

/**
 * POST /api/ratings
 * Body: { jobId, fromId, toId, score, comment? }
 * score: 'great' | 'issues'
 *
 * When score is 'great', increments the recipient's rating toward 5.0.
 * When score is 'issues', slightly nudges it down.
 */
export async function POST(req: NextRequest) {
  try {
    const { jobId, fromId, toId, score, comment } = await req.json();

    if (!jobId || !fromId || !toId || !score) {
      return NextResponse.json({ error: 'jobId, fromId, toId and score are required' }, { status: 400 });
    }

    if (!['great', 'issues'].includes(score)) {
      return NextResponse.json({ error: 'score must be "great" or "issues"' }, { status: 400 });
    }

    const sb = createServerSupabase();

    // Upsert rating (one per job per reviewer)
    const { error: ratingError } = await sb
      .from('ratings')
      .upsert(
        { job_id: jobId, from_id: fromId, to_id: toId, score, comment: comment ?? null },
        { onConflict: 'job_id,from_id' }
      );

    if (ratingError) throw ratingError;

    // Update the recipient's rolling average rating
    const { data: allRatings } = await sb
      .from('ratings')
      .select('score')
      .eq('to_id', toId);

    if (allRatings && allRatings.length > 0) {
      const greatCount  = allRatings.filter(r => r.score === 'great').length;
      const ratio       = greatCount / allRatings.length;           // 0..1
      const newRating   = 3.0 + ratio * 2.0;                        // maps to 3.0..5.0

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
