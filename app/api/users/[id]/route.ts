import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, mapUser } from '@/lib/supabase-server';
import { getSessionUser } from '@/lib/session';
import { isAdmin } from '@/lib/admin-auth';
import { normalizeUgPhone } from '@/lib/phone';

/** URL or null — uploaded document/photo URLs come from /api/upload. */
function docUrl(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null;
  const s = String(v).trim();
  if (s.length > 500 || !/^https?:\/\//.test(s)) throw new Error('Invalid document URL');
  return s;
}

type Params = { params: { id: string } };

/** GET /api/users/[id] — public profile. Phone numbers are private:
    only the owner themselves or an admin ever receives them. */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const sb = createServerSupabase();
    const { data, error } = await sb
      .from('profiles')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = mapUser(data);
    const viewer = await getSessionUser(req);
    if (!isAdmin(req) && (!viewer || viewer.id !== data.id)) {
      user.phone = '';
      // PDPO-sensitive fields — owner and admin/vetting team only
      user.nationalIdNumber = undefined;
      user.nationalIdPhotoUrl = undefined;
      user.nextOfKinName = undefined;
      user.nextOfKinPhone = undefined;
      user.certificatePhotoUrl = undefined;
      user.lcLetterPhotoUrl = undefined;
    }

    return NextResponse.json({ user });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * PATCH /api/users/[id]
 * Accepts a subset of SELF-SERVICE profile fields (camelCase).
 *
 * Identity comes from the server session: users can only update their own
 * profile. Trust fields (isVerified, rating, completedJobs) are NOT
 * self-service — they are set by admin actions and system events only.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (user.id !== params.id) {
      return NextResponse.json({ error: 'You can only update your own profile' }, { status: 403 });
    }

    const body = await req.json();

    // Map camelCase → snake_case (self-service fields only)
    const updates: Record<string, any> = {};
    if (body.name             !== undefined) updates.name              = body.name;
    if (body.location         !== undefined) updates.location          = body.location;
    if (body.avatar           !== undefined) updates.avatar            = body.avatar;
    if (body.about            !== undefined) updates.about             = body.about;
    if (body.skills           !== undefined) updates.skills            = body.skills;
    if (body.company          !== undefined) updates.company           = body.company;
    if (body.portfolioImages  !== undefined) updates.portfolio_images  = body.portfolioImages;
    // Worker's Mobile Money payout number — digits/+ only, 9–13 chars
    // (2567… or 07…). NOT a trust field; self-service is fine.
    if (body.momoPayoutPhone !== undefined) {
      const p = String(body.momoPayoutPhone ?? '').replace(/[^\d+]/g, '');
      if (p && !/^\+?\d{9,13}$/.test(p)) {
        return NextResponse.json({ error: 'Enter a valid Mobile Money number (e.g. 0772 123 456)' }, { status: 400 });
      }
      updates.momo_payout_phone = p || null;
    }
    // Where the worker's pay goes when a job is released: straight to
    // Mobile Money ('momo') or kept in the Tukola wallet ('wallet').
    if (body.payoutPreference !== undefined) {
      if (!['momo', 'wallet'].includes(body.payoutPreference)) {
        return NextResponse.json({ error: 'Invalid payout preference' }, { status: 400 });
      }
      updates.payout_preference = body.payoutPreference;
    }
    // Basic KYC — self-service, validated
    if (body.sex !== undefined) {
      if (body.sex !== null && !['male', 'female'].includes(body.sex)) {
        return NextResponse.json({ error: 'Invalid sex' }, { status: 400 });
      }
      updates.sex = body.sex;
    }
    if (body.dateOfBirth !== undefined) {
      if (body.dateOfBirth === null || body.dateOfBirth === '') {
        updates.date_of_birth = null;
      } else {
        const d = new Date(body.dateOfBirth);
        if (isNaN(d.getTime())) {
          return NextResponse.json({ error: 'Invalid date of birth' }, { status: 400 });
        }
        const age = (Date.now() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        if (age < 18 || age > 100) {
          return NextResponse.json({ error: 'You must be 18 or older to use Tukola' }, { status: 400 });
        }
        updates.date_of_birth = d.toISOString().slice(0, 10);
      }
    }

    // ── Trust-layer fields (migration 022) — self-service evidence for
    // the vetting queue. None of these confer a badge; is_verified stays
    // admin-set. national ID + next of kin are REQUIRED before a fundi
    // can apply for jobs (lib/profile-completion.ts).
    if (body.nationalIdNumber !== undefined) {
      const nin = String(body.nationalIdNumber ?? '').replace(/\s/g, '').toUpperCase();
      // Ugandan NIN is 13–14 alphanumeric; accept a loose band, never block on format trivia
      if (nin && !/^[A-Z0-9]{10,20}$/.test(nin)) {
        return NextResponse.json({ error: 'Enter a valid National ID number (NIN), e.g. CM1234567890AB' }, { status: 400 });
      }
      updates.national_id_number = nin || null;
    }
    if (body.nationalIdPhotoUrl !== undefined) {
      try { updates.national_id_photo_url = docUrl(body.nationalIdPhotoUrl); }
      catch { return NextResponse.json({ error: 'Invalid ID photo' }, { status: 400 }); }
    }
    if (body.nextOfKinName !== undefined) {
      const n = String(body.nextOfKinName ?? '').trim().slice(0, 100);
      updates.next_of_kin_name = n || null;
    }
    if (body.nextOfKinPhone !== undefined) {
      const raw = String(body.nextOfKinPhone ?? '').trim();
      if (!raw) {
        updates.next_of_kin_phone = null;
      } else {
        const p = normalizeUgPhone(raw);
        if (!p) {
          return NextResponse.json({ error: 'Enter a valid next-of-kin phone number (e.g. 0772 123 456)' }, { status: 400 });
        }
        updates.next_of_kin_phone = p;
      }
    }
    if (body.qualification !== undefined) {
      const q = String(body.qualification ?? '').trim().slice(0, 200);
      updates.qualification = q || null;
    }
    if (body.certificatePhotoUrl !== undefined) {
      try { updates.certificate_photo_url = docUrl(body.certificatePhotoUrl); }
      catch { return NextResponse.json({ error: 'Invalid certificate photo' }, { status: 400 }); }
    }
    if (body.lcLetterPhotoUrl !== undefined) {
      try { updates.lc_letter_photo_url = docUrl(body.lcLetterPhotoUrl); }
      catch { return NextResponse.json({ error: 'Invalid LC letter photo' }, { status: 400 }); }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const sb = createServerSupabase();
    const { data, error } = await sb
      .from('profiles')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ user: mapUser(data) });
  } catch (err: any) {
    console.error('[PATCH /api/users/[id]]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
