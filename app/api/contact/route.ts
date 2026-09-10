import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { hit, clientIp } from '@/lib/rate-limit';
import { getEmailProvider } from '@/lib/email/provider';

const VALID_KINDS = new Set(['employer', 'organisation', 'partnership', 'other']);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/contact
 * Body: { name, organisation?, email, phone?, kind?, message }
 *
 * Landing-page "Contact us" intake for employers and organisations.
 * Unlike feedback, a valid email is REQUIRED here — the whole point
 * is that we can reply. Rate-limited per IP. After storing, a
 * fire-and-forget notification email goes to ADMIN_EMAIL; email
 * failure never fails the request (the row is the source of truth).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    }

    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 100) : '';
    if (!name) {
      return NextResponse.json({ error: 'Please enter your name.' }, { status: 400 });
    }

    const email = typeof body.email === 'string' ? body.email.trim().slice(0, 200) : '';
    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address so we can reply.' }, { status: 400 });
    }

    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!message || message.length > 2000) {
      return NextResponse.json({ error: 'Please enter a message (up to 2000 characters).' }, { status: 400 });
    }

    const organisation = typeof body.organisation === 'string' ? body.organisation.trim().slice(0, 150) : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim().slice(0, 20) : '';
    const kind = VALID_KINDS.has(body.kind) ? body.kind : null;

    // Rate limit: 5 submissions per IP per 10 min (same as feedback)
    if (!hit(`contact:ip:${clientIp(req)}`, 5, 10 * 60 * 1000)) {
      return NextResponse.json(
        { error: 'Too many submissions. Please wait a few minutes and try again.' },
        { status: 429 }
      );
    }

    const supabase = createServerSupabase();
    const { error } = await supabase.from('contact_requests').insert({
      name,
      organisation: organisation || null,
      email,
      phone: phone || null,
      kind,
      message,
    });

    if (error) {
      console.error('[POST /api/contact] insert failed', error);
      return NextResponse.json({ error: 'Could not send your message. Please try again.' }, { status: 500 });
    }

    // Fire-and-forget: notify the founder inbox. Failure must never
    // fail the request — the row is stored and can be read in admin.
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
      const esc = (s: string) =>
        s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      getEmailProvider()
        .send({
          to: adminEmail,
          subject: `New Tukola contact: ${name}${organisation ? ` (${organisation})` : ''}`,
          text: `Name: ${name}\nOrganisation: ${organisation || '—'}\nEmail: ${email}\nPhone: ${phone || '—'}\nType: ${kind || '—'}\n\n${message}`,
          html: `<div style="font-family:sans-serif;max-width:560px">
            <h2 style="color:#2952E8">New contact request</h2>
            <p><b>Name:</b> ${esc(name)}<br/>
            <b>Organisation:</b> ${esc(organisation || '—')}<br/>
            <b>Email:</b> ${esc(email)}<br/>
            <b>Phone:</b> ${esc(phone || '—')}<br/>
            <b>Type:</b> ${esc(kind || '—')}</p>
            <p style="white-space:pre-wrap;background:#F0F4FF;padding:16px;border-radius:12px">${esc(message)}</p>
          </div>`,
        })
        .catch((e) => console.warn('[POST /api/contact] admin notify email failed', e));
    }

    return NextResponse.json({ sent: true });
  } catch (err: any) {
    console.error('[POST /api/contact]', err);
    return NextResponse.json({ error: 'Could not send your message. Please try again.' }, { status: 500 });
  }
}
