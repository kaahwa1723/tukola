import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, mapUser } from '@/lib/supabase-server';
import { getSessionUser } from '@/lib/session';
import { isAdmin } from '@/lib/admin-auth';

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
