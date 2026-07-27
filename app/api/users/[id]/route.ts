import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, mapUser } from '@/lib/supabase-server';
import { getSessionUser } from '@/lib/session';

type Params = { params: { id: string } };

/** GET /api/users/[id] */
export async function GET(_req: NextRequest, { params }: Params) {
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

    return NextResponse.json({ user: mapUser(data) });
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
