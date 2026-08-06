import { timingSafeEqual } from 'node:crypto';

/**
 * Shared cron authentication. Accepts either:
 *   - `x-cron-secret: <CRON_SECRET>`     (external schedulers, local testing)
 *   - `Authorization: Bearer <CRON_SECRET>`  (Vercel Cron's built-in convention)
 * Returns true only when CRON_SECRET is configured AND matches (timing-safe).
 */
export function isCronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const bearer = req.headers.get('authorization');
  const provided =
    req.headers.get('x-cron-secret') ??
    (bearer?.startsWith('Bearer ') ? bearer.slice(7) : '');

  const a = Buffer.from(provided, 'utf8');
  const b = Buffer.from(secret, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}
