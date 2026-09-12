import { NextRequest, NextResponse } from 'next/server';
import { normalizeUgPhone } from '@/lib/phone';
import { createOtp } from '@/lib/otp';
import { getSmsProvider } from '@/lib/sms/provider';
import { hit, clientIp } from '@/lib/rate-limit';
import { reportError } from '@/lib/error-report';

/**
 * POST /api/auth/otp/request
 * Body: { phone }
 *
 * Normalizes the phone to E.164 (+256), rate-limits, generates a 6-digit
 * OTP (10-min TTL, one active code per phone), and sends it through the
 * configured SmsProvider.
 *
 * In non-production builds the response includes `devCode` (mock provider
 * only) so the flow is testable end-to-end without an SMS vendor.
 * The production response NEVER contains the code.
 */
export async function POST(req: NextRequest) {
  try {
    const { phone: rawPhone } = await req.json();
    const phone = normalizeUgPhone(rawPhone);

    if (!phone) {
      return NextResponse.json({ error: 'Enter a valid Uganda phone number' }, { status: 400 });
    }

    // Rate limits: 3 codes per phone per 10 min; 10 per IP per 10 min
    if (!hit(`otp:req:phone:${phone}`, 3, 10 * 60 * 1000) ||
        !hit(`otp:req:ip:${clientIp(req)}`, 10, 10 * 60 * 1000)) {
      return NextResponse.json(
        { error: 'Too many codes requested. Please wait a few minutes and try again.' },
        { status: 429 }
      );
    }

    const code = await createOtp(phone);
    const provider = getSmsProvider();
    await provider.sendOtp(phone, code);

    const body: Record<string, unknown> = { sent: true, phone };
    if (process.env.NODE_ENV !== 'production' && provider.name === 'mock') {
      body.devCode = code; // mock provider only, never in production
    }

    return NextResponse.json(body);
  } catch (err: any) {
    console.error('[POST /api/auth/otp/request]', err);
    reportError('otp.request', err, { route: 'POST /api/auth/otp/request' });
    return NextResponse.json({ error: 'Could not send the code. Please try again.' }, { status: 500 });
  }
}
