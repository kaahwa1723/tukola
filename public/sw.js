/* TUKOLA service worker — offline discipline for low-end Android on
 * expensive, intermittent data (election-shutdown resilience).
 *
 * Strategy:
 *   - App shell (/, key pages, manifest, icons) precached at install.
 *   - Next.js build assets (/_next/static/*, fonts) → cache-first
 *     (content-hashed by the bundler, safe to cache long-term).
 *   - Page navigations → network-first, cache fallback when offline.
 *   - /api/* → network-only, NEVER cached (money + identity data).
 *     Offline submissions are handled by the client-side outbox in
 *     lib/offline-queue.ts, not by intercepting POSTs here — Background
 *     Sync is unreliable on the low-end Chrome/Android builds our users
 *     carry, so the outbox replays from the page instead.
 *
 * No dependencies, no workbox. Bump VERSION to force a full refresh.
 */
const VERSION = 'v1';
const SHELL_CACHE = `tukola-shell-${VERSION}`;
const STATIC_CACHE = `tukola-static-${VERSION}`;

const APP_SHELL = [
  '/',
  '/login',
  '/manifest.json',
  '/icon.png',
  '/favicon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      // Add individually: one missing asset must not abort the install
      Promise.allSettled(APP_SHELL.map((url) => cache.add(url)))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('tukola-') && k !== SHELL_CACHE && k !== STATIC_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/fonts/') ||
    url.pathname.startsWith('/images/') ||
    /\.(png|jpg|jpeg|webp|svg|ico|woff2?|ttf|otf)$/.test(url.pathname)
  );
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return; // mutations never touch the cache

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // CDN fonts etc: network

  // API: network-only. Fail fast with a clear offline signal so the
  // caller can route into the outbox queue.
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(req).catch(
        () =>
          new Response(JSON.stringify({ error: 'offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          })
      )
    );
    return;
  }

  // Static build assets: cache-first, populate on miss.
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(STATIC_CACHE).then((c) => c.put(req, copy));
            }
            return res;
          })
      )
    );
    return;
  }

  // Page navigations: network-first, fall back to the cached page,
  // then to the cached shell ('/') so the app always opens offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(SHELL_CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() =>
          caches.match(req).then((hit) => hit || caches.match('/'))
        )
    );
    return;
  }
});
