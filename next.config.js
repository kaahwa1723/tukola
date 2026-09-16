/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'randomuser.me' },
    ],
  },
  async headers() {
    return [
      {
        // The SW must always be re-fetched so updates roll out; the assets
        // it caches carry their own cache discipline.
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        ],
      },
      {
        // Security headers on every route (vibe-check #8 / vas "Security Headers").
        // CSP is deliberately NOT set here: Next.js App Router hydration relies on
        // inline scripts, so a correct CSP needs per-request nonces in middleware.
        // Tracked in SECURITY-CHECKLIST.md as a pending hardening item.
        source: '/:path*',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(self)' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
