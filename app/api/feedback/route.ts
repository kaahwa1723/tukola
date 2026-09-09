import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { hit, clientIp } from '@/lib/rate-limit';

const VALID_ROLES = new Set(['employer', 'worker', 'visitor']);
const VALID_SOURCES = new Set(['landing', 'app']);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/feedback
 * Body: { name?, email?, role?, message, rating?, source? }
 *
 * Public feedback intake (landing page + in-app /feedback page).
 * Validation only — feedback is anonymous-friendly, so name/email are
 * optional and never verified. Rate-limited per IP like the OTP route.
 * The response is deliberately generic; internals are never leaked.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    }

    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!message || message.length > 2000) {
      return NextResponse.json({ error: 'Please enter a message (up to 2000 characters).' }, { status: 400 });
    }

    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 100) : '';
    const email = typeof body.email === 'string' ? body.email.trim().slice(0, 200) : '';
    if (email && !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    let rating: number | null = null;
    if (body.rating != null) {
      const r = Number(body.rating);
      if (!Number.isInteger(r) || r < 1 || r > 5) {
        return NextResponse.json({ error: 'Rating must be between 1 and 5.' }, { status: 400 });
      }
      rating = r;
    }

    const role = VALID_ROLES.has(body.role) ? body.role : null;
    const source = VALID_SOURCES.has(body.source) ? body.source : null;

    // Rate limit: 5 submissions per IP per 10 min (same helper as OTP route)
    if (!hit(`feedback:ip:${clientIp(req)}`, 5, 10 * 60 * 1000)) {
      return NextResponse.json(
        { error: 'Too many submissions. Please wait a few minutes and try again.' },
        { status: 429 }
      );
    }

    const supabase = createServerSupabase();
    const { error } = await supabase.from('feedback').insert({
      name: name || null,
      email: email || null,
      role,
      message,
      rating,
      source,
    });

    if (error) {
      console.error('[POST /api/feedback] insert failed', error);
      return NextResponse.json({ error: 'Could not send your feedback. Please try again.' }, { status: 500 });
    }

    return NextResponse.json({ sent: true });
  } catch (err: any) {
    console.error('[POST /api/feedback]', err);
    return NextResponse.json({ error: 'Could not send your feedback. Please try again.' }, { status: 500 });
  }
}
