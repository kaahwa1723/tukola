import { NextRequest, NextResponse } from 'next/server';

/**
 * Site-mode gate (founder, 1 Oct 2026): while the marketplace is shelved,
 * every public route rewrites to /coming-soon. The URL stays clean and
 * ?ref=<code> survives, so referral links keep working.
 *
 * ALWAYS OPEN — recruitment and ops never stop:
 *   /admin, /api        admin panel + all API routes (individually gated)
 *   /login /verify /role /onboarding /worker   the fundi sign-up flow
 *   /terms /privacy /help                      legal/support pages
 *
 * Everything else (/, /employer, /job, /wallet, /completion) is shelved.
 *
 * The flag lives in site_settings (migration 024) and flips only from the
 * admin panel. FAIL-CLOSED: if the flag can't be read, the site shows
 * coming soon — protecting the idea outranks availability here, and the
 * admin panel stays reachable regardless.
 */

const OPEN_PREFIXES = [
  '/admin', '/api', '/coming-soon',
  '/login', '/verify', '/role', '/onboarding', '/worker',
  '/terms', '/privacy', '/help', '/feedback',
];

type SiteMode = 'live' | 'coming_soon';

// Short in-memory cache per edge isolate — a flip propagates within ~45s.
let cached: { mode: SiteMode; at: number } | null = null;
const CACHE_TTL_MS = 45_000;

async function getSiteMode(): Promise<SiteMode> {
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.mode;
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return 'coming_soon';
    const res = await fetch(`${url}/rest/v1/site_settings?key=eq.site_mode&select=value`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: 'no-store',
    });
    if (!res.ok) return 'coming_soon';
    const rows = await res.json();
    const mode: SiteMode = rows?.[0]?.value === 'live' ? 'live' : 'coming_soon';
    cached = { mode, at: Date.now() };
    return mode;
  } catch {
    return 'coming_soon';
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (OPEN_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  if (await getSiteMode() === 'live') {
    return NextResponse.next();
  }

  // Rewrite (not redirect): the visitor keeps the URL they typed,
  // and query strings (?ref= referral codes) pass through untouched.
  const url = req.nextUrl.clone();
  url.pathname = '/coming-soon';
  return NextResponse.rewrite(url);
}

export const config = {
  // Skip build output, static assets, and metadata files.
  matcher: [
    '/((?!_next/static|_next/image|_next/webpack-hmr|favicon.png|apple-icon.png|icon.png|logo-gradient.png|logo-white.png|images|frames|fonts|manifest.json|sw.js|robots.txt|sitemap.xml).*)',
  ],
};
