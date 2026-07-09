import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, mapUser } from '@/lib/supabase-server';

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
 * Accepts any subset of profile fields (camelCase).
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const body = await req.json();

    // Map camelCase → snake_case
    const updates: Record<string, any> = {};
    if (body.name             !== undefined) updates.name              = body.name;
    if (body.location         !== undefined) updates.location          = body.location;
    if (body.avatar           !== undefined) updates.avatar            = body.avatar;
    if (body.about            !== undefined) updates.about             = body.about;
    if (body.skills           !== undefined) updates.skills            = body.skills;
    if (body.company          !== undefined) updates.company           = body.company;
    if (body.responseTime     !== undefined) updates.response_time     = body.responseTime;
    if (body.lastActive       !== undefined) updates.last_active       = body.lastActive;
    if (body.isVerified       !== undefined) updates.is_verified       = body.isVerified;
    if (body.rating           !== undefined) updates.rating            = body.rating;
    if (body.completedJobs    !== undefined) updates.completed_jobs    = body.completedJobs;
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
