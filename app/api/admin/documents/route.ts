import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, mapUser } from '@/lib/supabase-server';
import { isAdmin } from '@/lib/admin-auth';
import { computeProfileCompletion } from '@/lib/profile-completion';

/**
 * GET /api/admin/documents
 *
 * The document review queue (founder, 24 Sep 2026): every fundi who has
 * submitted ANY vetting document (national ID photo, LC1/area letter,
 * certificate) or NIN, newest first. Each entry carries the document URLs,
 * the profile-completion checklist result, and the current verified flag.
 *
 * Review ACTION is the existing PATCH /api/admin/users/[id] { isVerified }
 * — this route is read-only; verification stays a deliberate admin toggle
 * on the user, exactly like the Users page.
 *
 * Admin-only (PIN session). These documents are PDPO-sensitive — this is
 * the one place besides the owner where they are served.
 */
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const sb = createServerSupabase();
    const { data, error } = await sb
      .from('profiles')
      .select('*')
      .eq('role', 'worker')
      .order('created_at', { ascending: false })
      .limit(1000);
    if (error) throw error;

    const queue = (data ?? [])
      .map(row => {
        const user = mapUser(row);
        const completion = computeProfileCompletion(user);
        return {
          userId: user.id,
          name: user.name,
          phone: user.phone,
          location: user.location ?? '',
          skills: user.skills ?? [],
          joinedAt: row.created_at,
          isVerified: user.isVerified ?? false,
          completedJobs: user.completedJobs ?? 0,
          percent: completion.percent,
          missing: completion.items.filter(i => !i.done).map(i => i.key),
          docs: {
            nationalIdNumber: user.nationalIdNumber ?? null,
            nationalIdPhotoUrl: user.nationalIdPhotoUrl ?? null,
            nextOfKinName: user.nextOfKinName ?? null,
            nextOfKinPhone: user.nextOfKinPhone ?? null,
            qualification: user.qualification ?? null,
            certificatePhotoUrl: user.certificatePhotoUrl ?? null,
            lcLetterPhotoUrl: user.lcLetterPhotoUrl ?? null,
          },
        };
      })
      // Only fundis who have submitted SOMETHING for review
      .filter(u =>
        u.docs.nationalIdNumber || u.docs.nationalIdPhotoUrl ||
        u.docs.certificatePhotoUrl || u.docs.lcLetterPhotoUrl ||
        u.docs.nextOfKinName
      )
      // Unverified with the most complete submissions first
      .sort((a, b) => Number(a.isVerified) - Number(b.isVerified) || b.percent - a.percent);

    return NextResponse.json({
      queue,
      totalWorkersWithDocs: queue.length,
      pendingVerification: queue.filter(u => !u.isVerified).length,
    });
  } catch (err: any) {
    console.error('[GET /api/admin/documents]', err);
    return NextResponse.json({ error: 'Could not load the document review queue.' }, { status: 500 });
  }
}
