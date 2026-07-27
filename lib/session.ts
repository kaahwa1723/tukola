import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto';
import { createServerSupabase, mapUser } from './supabase-server';
import type { User } from './types';

/**
 * Server-side session issuance & verification.
 *
 * The session is an HMAC-signed token in an HttpOnly cookie (`kola_session`).
 * Format: base64url(`${userId}.${expiresAtMs}`) + '.' + hex HMAC-SHA256.
 * Identity on every API route must come from getSessionUser(req) — never
 * from client-supplied IDs, query params, or localStorage.
 *
 * SESSION_SECRET env var:
 *   - production: REQUIRED — the process throws if it is missing.
 *   - development: if unset, a random per-boot secret is generated so no
 *     hardcoded secret ever exists; sessions simply die on server restart.
 */

export const SESSION_COOKIE = 'kola_session';
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

let devSecret: string | null = null;

export function getSessionSecret(): string {
  const env = process.env.SESSION_SECRET;
  if (env && env.length >= 16) return env;

  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET is not configured — refusing to issue sessions in production');
  }

  // Dev-only: ephemeral random secret, never persisted, never hardcoded
  if (!devSecret) {
    devSecret = randomBytes(32).toString('hex');
    console.warn('[session] SESSION_SECRET not set — using ephemeral dev secret (sessions die on restart)');
  }
  return devSecret;
}

function b64url(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url');
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

/** Create a signed session token for a user ID. */
export function createSessionToken(userId: string): string {
  const secret = getSessionSecret();
  const payload = b64url(`${userId}.${Date.now() + SESSION_TTL_MS}`);
  return `${payload}.${sign(payload, secret)}`;
}

/** Verify a session token; returns the user ID or null. Timing-safe. */
export function verifySessionToken(token: string | null | undefined): string | null {
  if (!token) return null;
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;

  const payload = token.slice(0, dot);
  const provided = token.slice(dot + 1);

  let secret: string;
  try {
    secret = getSessionSecret();
  } catch {
    return null;
  }

  const expected = sign(payload, secret);
  const a = Buffer.from(provided, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const decoded = Buffer.from(payload, 'base64url').toString('utf8');
  const sep = decoded.lastIndexOf('.');
  if (sep <= 0) return null;

  const userId = decoded.slice(0, sep);
  const expiresAt = Number(decoded.slice(sep + 1));
  if (!userId || !Number.isFinite(expiresAt) || Date.now() > expiresAt) return null;

  return userId;
}

/** Extract and verify the session cookie from a request; returns user ID or null. */
export function getSessionUserId(req: Request): string | null {
  const cookieHeader = req.headers.get('cookie') || '';
  const match = cookieHeader.match(/(?:^|;\s*)kola_session=([^;]+)/);
  if (!match) return null;
  return verifySessionToken(decodeURIComponent(match[1]));
}

/**
 * Resolve the full user profile for the session — THE canonical way for
 * API routes to learn who is calling. Returns null when not authenticated.
 */
export async function getSessionUser(req: Request): Promise<User | null> {
  const userId = getSessionUserId(req);
  if (!userId) return null;

  const sb = createServerSupabase();
  const { data } = await sb.from('profiles').select('*').eq('id', userId).single();
  if (!data || data.blocked) return null;

  return mapUser(data);
}

/** Attach a fresh session cookie to a response. */
export function setSessionCookie(res: { cookies: { set: Function } }, userId: string): void {
  res.cookies.set(SESSION_COOKIE, createSessionToken(userId), {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_TTL_MS / 1000,
  });
}

/** Clear the session cookie (logout). */
export function clearSessionCookie(res: { cookies: { set: Function } }): void {
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
}
