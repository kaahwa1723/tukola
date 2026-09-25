import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, mapUser } from '@/lib/supabase-server';
import { isAdmin } from '@/lib/admin-auth';
import { computeProfileCompletion } from '@/lib/profile-completion';
import { submitVettingReview, type VettingChecks, type VettingDecision } from '@/lib/vetting';

/**
 * GET /api/admin/vetting
 *
 * The Verified+ vetting queue: every fundi who has submitted ANY vetting
 * document, joined with their latest vetting_reviews row and current
 * verified_plus flag. Ordered: never-reviewed first, then in-review,
 * then decided — most complete profiles first within each group.
 *
 * POST /api/admin/vetting
 *
 * Record a review decision. Body:
 *   { fundiId, checks: { idOk, lcLetterOk, certificateOk, issuerCheckOk,
 *     policeClearanceOk }, decision: 'in_review'|'approve'|'reject', notes? }
 * Approve requires ALL five checks true — enforced again in lib/vetting.
 * This route is the ONLY path that sets profiles.verified_plus.
 *
 * Admin-only (PIN session). PDPO-sensitive documents are visible here.
 */
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const sb = createServerSupabase();
    const [{ data: workers, error: wErr }, { data: reviews, error: rErr }] = await Promise.all([
      sb.from('profiles').select('*').eq('role', 'worker').order('created_at', { ascending: false }).limit(1000),
      sb.from('vetting_reviews').select('*').order('created_at', { ascending: false }).limit(2000),
    ]);
    if (wErr) throw wErr;
    if (rErr) throw rErr;

    // Latest review per fundi (rows are already newest-first).
    const latestByFundi = new Map<string, any>();
    for (const r of reviews ?? []) {
      if (!latestByFundi.has(r.fundi_id)) latestByFundi.set(r.fundi_id, r);
    }

    const queue = (workers ?? [])
      .map(row => {
        const user = mapUser(row);
        const completion = computeProfileCompletion(user);
        const latest = latestByFundi.get(user.id) ?? null;
        return {
          userId: user.id,
          name: user.name,
          phone: user.phone,
          location: user.location ?? '',
          skills: user.skills ?? [],
          joinedAt: row.created_at,
          isVerified: user.isVerified ?? false,
          verifiedPlus: user.verifiedPlus ?? false,
          completedJobs: user.completedJobs ?? 0,
          percent: completion.percent,
          docs: {
            nationalIdNumber: user.nationalIdNumber ?? null,
            nationalIdPhotoUrl: user.nationalIdPhotoUrl ?? null,
            nextOfKinName: user.nextOfKinName ?? null,
            nextOfKinPhone: user.nextOfKinPhone ?? null,
            qualification: user.qualification ?? null,
            certificatePhotoUrl: user.certificatePhotoUrl ?? null,
            lcLetterPhotoUrl: user.lcLetterPhotoUrl ?? null,
          },
          latestReview: latest
            ? {
                status: latest.status as string,
                checks: {
                  idOk: !!latest.id_ok,
                  lcLetterOk: !!latest.lc_letter_ok,
                  certificateOk: !!latest.certificate_ok,
                  issuerCheckOk: !!latest.issuer_check_ok,
                  policeClearanceOk: !!latest.police_clearance_ok,
                },
                notes: latest.notes as string | null,
                reviewedBy: latest.reviewed_by as string | null,
                reviewedAt: latest.reviewed_at as string | null,
                createdAt: latest.created_at as string,
              }
            : null,
        };
      })
      // Only fundis who have submitted SOMETHING for review
      .filter(u =>
        u.docs.nationalIdNumber || u.docs.nationalIdPhotoUrl ||
        u.docs.certificatePhotoUrl || u.docs.lcLetterPhotoUrl ||
        u.docs.nextOfKinName
      )
      .sort((a, b) => {
        // Needs action first: no review yet, then in_review, then decided.
        const rank = (u: typeof a) =>
          u.verifiedPlus ? 3 : !u.latestReview ? 0 : u.latestReview.status === 'in_review' ? 1 : u.latestReview.status === 'rejected' ? 2 : 3;
        return rank(a) - rank(b) || b.percent - a.percent;
      });

    return NextResponse.json({
      queue,
      pendingReview: queue.filter(u => !u.verifiedPlus && u.latestReview?.status !== 'approved').length,
      verifiedPlusCount: queue.filter(u => u.verifiedPlus).length,
    });
  } catch (err: any) {
    console.error('[GET /api/admin/vetting]', err);
    return NextResponse.json({ error: 'Could not load the vetting queue.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => null);
    const fundiId = typeof body?.fundiId === 'string' ? body.fundiId : '';
    const decision = body?.decision as VettingDecision;
    const notes = typeof body?.notes === 'string' ? body.notes.slice(0, 500) : undefined;
    const c = body?.checks ?? {};

    if (!fundiId) {
      return NextResponse.json({ error: 'fundiId is required.' }, { status: 400 });
    }
    if (!['in_review', 'approve', 'reject'].includes(decision)) {
      return NextResponse.json({ error: 'decision must be in_review, approve or reject.' }, { status: 400 });
    }

    const checks: VettingChecks = {
      idOk: c.idOk === true,
      lcLetterOk: c.lcLetterOk === true,
      certificateOk: c.certificateOk === true,
      issuerCheckOk: c.issuerCheckOk === true,
      policeClearanceOk: c.policeClearanceOk === true,
    };

    const result = await submitVettingReview({ fundiId, checks, decision, notes, reviewedBy: 'admin' });
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, status: result.status });
  } catch (err: any) {
    console.error('[POST /api/admin/vetting]', err);
    return NextResponse.json({ error: 'Could not save the review. Please try again.' }, { status: 500 });
  }
}
