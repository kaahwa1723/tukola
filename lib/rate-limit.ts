/**
 * Minimal in-memory sliding-window rate limiter.
 *
 * Good enough for a single-instance deployment (Vercel hobby / one VPS).
 * Known limitation: limits reset when the serverless function cold-starts.
 * When we outgrow one instance, swap this for a Postgres- or Redis-backed
 * limiter behind the same hit() signature.
 */

interface Bucket {
  timestamps: number[];
}

const buckets = new Map<string, Bucket>();

// Periodically drop stale buckets so the map doesn't grow forever
const GC_INTERVAL_MS = 10 * 60 * 1000;
let lastGc = Date.now();

function gc(now: number) {
  if (now - lastGc < GC_INTERVAL_MS) return;
  lastGc = now;
  buckets.forEach((bucket, key) => {
    if (bucket.timestamps.length === 0 || now - bucket.timestamps[bucket.timestamps.length - 1] > GC_INTERVAL_MS) {
      buckets.delete(key);
    }
  });
}

/**
 * Record an attempt for `key`. Returns true when the attempt is ALLOWED
 * (fewer than `limit` hits inside `windowMs`), false when rate-limited.
 */
export function hit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  gc(now);

  const bucket = buckets.get(key) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter(t => now - t < windowMs);

  if (bucket.timestamps.length >= limit) {
    buckets.set(key, bucket);
    return false;
  }

  bucket.timestamps.push(now);
  buckets.set(key, bucket);
  return true;
}

/** Best-effort client IP extraction for rate-limit keys. */
export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}
