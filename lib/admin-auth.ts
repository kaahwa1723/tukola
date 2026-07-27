import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Admin session secret — env-only, no fallbacks.
 * Returns null when ADMIN_SESSION_SECRET is not configured; callers must
 * fail closed (deny access) in that case. Never hardcode a default here.
 */
export function getAdminSessionSecret(): string | null {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 16) return null;
  return secret;
}

export function adminSessionToken(secret: string): string {
  return createHmac('sha256', secret).update('tukola-admin').digest('hex');
}

/**
 * Verifies the `kola_admin` HttpOnly cookie set by /api/admin/auth.
 * The cookie holds an HMAC-SHA256 hex of 'tukola-admin' keyed with the
 * admin session secret — recomputed here and compared timing-safe.
 */
export function isAdmin(req: Request): boolean {
  try {
    const cookieHeader = req.headers.get('cookie') || '';
    const match = cookieHeader.match(/(?:^|;\s*)kola_admin=([^;]+)/);
    if (!match) return false;

    const secret = getAdminSessionSecret();
    if (!secret) return false; // fail closed when not configured
    const expected = adminSessionToken(secret);

    const provided = Buffer.from(match[1], 'utf8');
    const expectedBuf = Buffer.from(expected, 'utf8');
    if (provided.length !== expectedBuf.length) return false;

    return timingSafeEqual(provided, expectedBuf);
  } catch {
    return false;
  }
}
