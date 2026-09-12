import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { getSessionUser } from '@/lib/session';
import { JOB_CATEGORIES } from '@/lib/constants';
import { track } from '@/lib/analytics';

export const dynamic = 'force-dynamic'; // live DB search — never prerender

const MAX_SERVICES_PER_WORKER = 20;
const MAX_PRICE_UGX = 100_000_000; // sanity cap, not a pricing rule

function mapService(row: any) {
  const w = row.profiles ?? row.worker ?? {};
  return {
    id: row.id,
    workerId: row.worker_id,
    title: row.title,
    category: row.category,
    unitLabel: row.unit_label ?? null,
    priceUgx: row.price_ugx,
    description: row.description ?? '',
    active: row.active,
    createdAt: row.created_at,
    worker: {
      id: w.id ?? row.worker_id,
      name: w.name ?? 'Fundi',
      avatar: w.avatar ?? undefined,
      rating: w.rating != null ? Number(w.rating) : undefined,
      completedJobs: w.completed_jobs ?? 0,
      reliabilityScore: w.reliability_score != null ? Number(w.reliability_score) : null,
      location: w.location ?? undefined,
      isVerified: w.is_verified ?? false,
      skills: w.skills ?? [],
    },
  };
}

/**
 * GET /api/services — browse fundi-posted priced services.
 *
 * Query params:
 *   - category  one of JOB_CATEGORIES
 *   - q         free text matched against title/description
 *   - area      parish/area text matched against the worker's location
 *   - workerId  only this worker's services (profile pages)
 *   - limit     max results (default 30, cap 60)
 *
 * Ranking is MERIT ONLY: worker rating (nulls last), then completed
 * jobs — same doctrine as /api/fundis. No paid placement.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const category = searchParams.get('category')?.trim();
    const q        = searchParams.get('q')?.trim();
    const area     = searchParams.get('area')?.trim();
    const workerId = searchParams.get('workerId')?.trim();
    const limit    = Math.min(parseInt(searchParams.get('limit') ?? '30'), 60);

    const sb = createServerSupabase();
    // A worker viewing their OWN listings sees inactive ones too;
    // everyone else only ever sees active listings.
    const viewer = await getSessionUser(req);
    const ownListings = !!workerId && viewer?.id === workerId;

    let query = sb
      .from('worker_services')
      .select('*, profiles!worker_id(id, name, avatar, rating, completed_jobs, reliability_score, location, is_verified, skills, blocked)')
      .order('created_at', { ascending: false })
      .limit(200); // pre-filter cap; JS ranking trims to `limit`

    if (!ownListings) query = query.eq('active', true);

    if (category) query = query.eq('category', category);
    if (workerId) query = query.eq('worker_id', workerId);
    if (q)        query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,category.ilike.%${q}%`);

    const { data, error } = await query;
    if (error) throw error;

    let services = (data ?? [])
      // Blocked workers' listings never surface publicly
      .filter((r: any) => !(r.profiles?.blocked))
      // Area filter matches the WORKER's declared work area (parish-level)
      .filter((r: any) => !area || (r.profiles?.location ?? '').toLowerCase().includes(area.toLowerCase()))
      .map((r: any) => mapService(r));

    // Merit ranking: rating (undefined last), then completed jobs
    services.sort((a, b) =>
      (b.worker.rating ?? -1) - (a.worker.rating ?? -1) ||
      b.worker.completedJobs - a.worker.completedJobs
    );

    services = services.slice(0, limit);
    // Top 3 get a premium-suggestion badge (same rule as FundiFinder)
    services.forEach((s, i) => {
      (s as any).topRated = i < 3 && (s.worker.rating != null || s.worker.completedJobs > 0);
    });

    return NextResponse.json({ services, category: category ?? null, area: area ?? null });
  } catch (err: any) {
    console.error('[GET /api/services]', err);
    return NextResponse.json({ error: 'Could not load services.' }, { status: 500 });
  }
}

/**
 * POST /api/services — a worker posts a priced service listing.
 * Body: { title, category, unitLabel?, priceUgx, description? }
 *
 * Worker identity comes from the server session; only worker-role
 * accounts can list services. Listings appear in employer search
 * immediately (active=true by default).
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (user.role !== 'worker') {
      return NextResponse.json({ error: 'Only worker accounts can post services' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const title       = String(body.title ?? '').trim();
    const category    = String(body.category ?? '').trim();
    const unitLabel   = body.unitLabel ? String(body.unitLabel).trim() : null;
    const priceUgx    = Number(body.priceUgx);
    const description = body.description ? String(body.description).trim() : null;

    if (!title || title.length > 80) {
      return NextResponse.json({ error: 'A service title is required (max 80 characters)' }, { status: 400 });
    }
    if (!JOB_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: 'Choose a valid category' }, { status: 400 });
    }
    if (!Number.isInteger(priceUgx) || priceUgx <= 0 || priceUgx > MAX_PRICE_UGX) {
      return NextResponse.json({ error: 'Enter a valid price in UGX' }, { status: 400 });
    }
    if (unitLabel && unitLabel.length > 30) {
      return NextResponse.json({ error: 'Unit label too long (e.g. "per room")' }, { status: 400 });
    }

    const sb = createServerSupabase();

    // Per-worker listing cap keeps menus scannable for employers
    const { count } = await sb
      .from('worker_services')
      .select('id', { count: 'exact', head: true })
      .eq('worker_id', user.id)
      .eq('active', true);
    if ((count ?? 0) >= MAX_SERVICES_PER_WORKER) {
      return NextResponse.json(
        { error: `You can have at most ${MAX_SERVICES_PER_WORKER} active services. Remove one first.` },
        { status: 409 }
      );
    }

    const { data, error } = await sb
      .from('worker_services')
      .insert({
        worker_id: user.id,
        title,
        category,
        unit_label: unitLabel,
        price_ugx: priceUgx,
        description,
      })
      .select('*, profiles!worker_id(id, name, avatar, rating, completed_jobs, reliability_score, location, is_verified, skills, blocked)')
      .single();
    if (error) throw error;

    track('service_posted', user.id, { serviceId: data.id, category, priceUgx });
    return NextResponse.json({ service: mapService(data) }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/services]', err);
    return NextResponse.json({ error: 'Could not save this service. Please try again.' }, { status: 500 });
  }
}
