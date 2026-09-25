import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { createServerSupabase } from '@/lib/supabase-server';
import { getLatestReview } from '@/lib/vetting';

/**
 * GET /api/vetting
 *
 * The signed-in fundi's own vetting status: their latest vetting_reviews
 * row plus the current verified_plus flag. Session-derived identity only —
 * a worker can never read another fundi's review. The response carries
 * status + reviewer notes (the rejection reason) but never admin internals
 * beyond what the fundi needs to act on.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const sb = createServerSupabase();
    const { data: profile, error } = await sb
      .from('profiles')
      .select('verified_plus')
      .eq('id', user.id)
      .maybeSingle();
    if (error) throw error;

    const latest = await getLatestReview(user.id);

    return NextResponse.json({
      verifiedPlus: profile?.verified_plus ?? false,
      latestReview: latest
        ? {
            status: latest.status,
            checks: {
              idOk: !!latest.id_ok,
              lcLetterOk: !!latest.lc_letter_ok,
              certificateOk: !!latest.certificate_ok,
              issuerCheckOk: !!latest.issuer_check_ok,
              policeClearanceOk: !!latest.police_clearance_ok,
            },
            notes: latest.notes ?? null,
            reviewedAt: latest.reviewed_at ?? null,
          }
        : null,
    });
  } catch (err: any) {
    console.error('[GET /api/vetting]', err);
    return NextResponse.json({ error: 'Could not load vetting status.' }, { status: 500 });
  }
}
