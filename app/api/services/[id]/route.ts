import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { getSessionUser } from '@/lib/session';
import { JOB_CATEGORIES } from '@/lib/constants';

type Params = { params: { id: string } };

/**
 * GET /api/services/[id] — public detail for the booking page.
 * Only active listings from non-blocked workers are visible.
 *
 * PATCH /api/services/[id] — owner edits their listing.
 * Body: any of { title, category, unitLabel, priceUgx, description, active }
 *
 * DELETE /api/services/[id] — owner removes their listing.
 * jobs.service_id has ON DELETE SET NULL, so past bookings keep
 * their history (price is snapshotted on the job itself).
 */

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const sb = createServerSupabase();
    const { data } = await sb
      .from('worker_services')
      .select('*, profiles!worker_id(id, name, avatar, rating, completed_jobs, reliability_score, location, is_verified, skills, blocked, about)')
      .eq('id', params.id)
      .maybeSingle();

    if (!data || !data.active || (data.profiles as any)?.blocked) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }
    const w = data.profiles as any;
    return NextResponse.json({
      service: {
        id: data.id,
        workerId: data.worker_id,
        title: data.title,
        category: data.category,
        unitLabel: data.unit_label ?? null,
        priceUgx: data.price_ugx,
        description: data.description ?? '',
        worker: {
          id: w.id,
          name: w.name,
          avatar: w.avatar ?? undefined,
          rating: w.rating != null ? Number(w.rating) : undefined,
          completedJobs: w.completed_jobs ?? 0,
          reliabilityScore: w.reliability_score != null ? Number(w.reliability_score) : null,
          location: w.location ?? undefined,
          isVerified: w.is_verified ?? false,
          skills: w.skills ?? [],
          about: w.about ?? '',
        },
      },
    });
  } catch (err: any) {
    console.error('[GET /api/services/[id]]', err);
    return NextResponse.json({ error: 'Could not load this service.' }, { status: 500 });
  }
}

async function loadOwnedService(sb: ReturnType<typeof createServerSupabase>, id: string, userId: string) {
  const { data } = await sb
    .from('worker_services')
    .select('id, worker_id')
    .eq('id', id)
    .maybeSingle();
  if (!data) return { error: NextResponse.json({ error: 'Service not found' }, { status: 404 }) };
  if (data.worker_id !== userId) {
    return { error: NextResponse.json({ error: 'You can only edit your own services' }, { status: 403 }) };
  }
  return { service: data };
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const sb = createServerSupabase();
    const { error: ownError } = await loadOwnedService(sb, params.id, user.id);
    if (ownError) return ownError;

    const body = await req.json().catch(() => ({}));
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.title !== undefined) {
      const title = String(body.title).trim();
      if (!title || title.length > 80) {
        return NextResponse.json({ error: 'A service title is required (max 80 characters)' }, { status: 400 });
      }
      patch.title = title;
    }
    if (body.category !== undefined) {
      if (!JOB_CATEGORIES.includes(String(body.category))) {
        return NextResponse.json({ error: 'Choose a valid category' }, { status: 400 });
      }
      patch.category = String(body.category);
    }
    if (body.unitLabel !== undefined) {
      const u = body.unitLabel ? String(body.unitLabel).trim() : null;
      if (u && u.length > 30) {
        return NextResponse.json({ error: 'Unit label too long (e.g. "per room")' }, { status: 400 });
      }
      patch.unit_label = u;
    }
    if (body.priceUgx !== undefined) {
      const p = Number(body.priceUgx);
      if (!Number.isInteger(p) || p <= 0 || p > 100_000_000) {
        return NextResponse.json({ error: 'Enter a valid price in UGX' }, { status: 400 });
      }
      patch.price_ugx = p;
    }
    if (body.description !== undefined) {
      patch.description = body.description ? String(body.description).trim() : null;
    }
    if (body.active !== undefined) {
      patch.active = Boolean(body.active);
    }

    const { data, error } = await sb
      .from('worker_services')
      .update(patch)
      .eq('id', params.id)
      .select('*, profiles!worker_id(id, name, avatar, rating, completed_jobs, reliability_score, location, is_verified, skills, blocked)')
      .single();
    if (error) throw error;

    return NextResponse.json({ ok: true, service: data });
  } catch (err: any) {
    console.error('[PATCH /api/services/[id]]', err);
    return NextResponse.json({ error: 'Could not update this service.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const sb = createServerSupabase();
    const { error: ownError } = await loadOwnedService(sb, params.id, user.id);
    if (ownError) return ownError;

    const { error } = await sb.from('worker_services').delete().eq('id', params.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[DELETE /api/services/[id]]', err);
    return NextResponse.json({ error: 'Could not remove this service.' }, { status: 500 });
  }
}
