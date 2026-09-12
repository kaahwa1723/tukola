import type { MetadataRoute } from 'next';

/**
 * robots.txt — the landing page and legal pages are crawlable;
 * the app itself (accounts, jobs, admin, API) is not, because
 * those routes are session-gated anyway and indexing them wastes
 * crawl budget on login walls.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/terms', '/privacy'],
        disallow: ['/admin', '/api', '/employer', '/worker', '/job', '/login', '/verify', '/role', '/onboarding', '/feedback', '/messages'],
      },
    ],
    sitemap: 'https://tukolaapp.com/sitemap.xml',
  };
}
