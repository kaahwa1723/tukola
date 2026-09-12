import type { MetadataRoute } from 'next';

/** sitemap.xml — public, crawlable pages only. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://tukolaapp.com';
  return [
    { url: base, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/terms`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}/privacy`, changeFrequency: 'monthly', priority: 0.3 },
  ];
}
