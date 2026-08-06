import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { getSessionUser } from '@/lib/session';
import { getPaymentProvider } from '@/lib/payments/provider';
import { normalizeUgPhone } from '@/lib/phone';

/**
 * GET /api/payments?jobId=xxx
 * Returns the latest payment for a job. Parties only.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const jobId = req.nextUrl.searchParams.get('jobId');
    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
    }

    const sb = createServerSupabase();
    const { data: payment } = await sb
      .from('payments')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!payment) return NextResponse.json({ payment: null });
    if (payment.payer_id !== user.id && payment.payee_id !== user.id) {
      return NextResponse.json({ error: 'Only the parties of this payment can view it' }, { status: 403 });
    }

    return NextResponse.json({ payment });
  } catch (err: any) {
    console.error('[GET /api/payments]', err);
    return NextResponse.json({ error: 'Could not load the payment.' }, { status: 500 });
  }
}

/**
 * POST /api/payments
 * Body: { jobId, momoPhone, idempotencyKey? }
 *
 * The employer funds a job: creates an escrow payment (status 'pending')
 * and sends a MoMo RequestToPay — the customer gets a USSD push and must
 * enter their PIN (Uganda has no auto-debit; the wait is the UX).
 *
 * - Payer identity comes from the session; payee is the job's ACCEPTED
 *   worker; amount is the job's stored pay — none of it is client-trusted.
 * - momoPhone is normalized to E.164; it may differ from the contact number.
 * - Idempotent: one active payment per job. Re-submitting returns the
 *   existing payment instead of double-charging.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { jobId, momoPhone: rawPhone } = await req.json();
    const momoPhone = normalizeUgPhone(rawPhone);
    if (!jobId || !momoPhone) {
      return NextResponse.json({ error: 'jobId and a valid Uganda MoMo number are required' }, { status: 400 });
    }

    const sb = createServerSupabase();

    // Load the job; only its employer can fund it
    const { data: job } = await sb
      .from('jobs')
      .select('id, employer_id, pay, status, title')
      .eq('id', jobId)
      .maybeSingle();

    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    if (job.employer_id !== user.id) {
      return NextResponse.json({ error: 'Only the employer who posted this job can fund it' }, { status: 403 });
    }
    if (!job.pay || job.pay <= 0) {
      return NextResponse.json({ error: 'This job has no agreed pay amount' }, { status: 400 });
    }

    // The payee is the accepted worker
    const { data: accepted } = await sb
      .from('applications')
      .select('worker_id')
      .eq('job_id', jobId)
      .eq('status', 'accepted')
      .limit(1);
    const payeeId = accepted?.[0]?.worker_id;
    if (!payeeId) {
      return NextResponse.json({ error: 'No accepted worker on this job yet' }, { status: 409 });
    }

    // Idempotency: one active payment per job — return the existing one
    const { data: existing } = await sb
      .from('payments')
      .select('*')
      .eq('job_id', jobId)
      .neq('status', 'refunded')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ payment: existing, idempotent: true });
    }

    const provider = getPaymentProvider();
    const idempotencyKey = `pay_${jobId}`;

    // Create the escrow row first (money moves only against a ledger row)
    const { data: payment, error } = await sb
      .from('payments')
      .insert({
        job_id: jobId,
        payer_id: user.id,
        payee_id: payeeId,
        amount: job.pay,
        status: 'pending',
        provider: provider.name,
        idempotency_key: idempotencyKey,
        payer_momo_phone: momoPhone,
      })
      .select()
      .single();

    if (error) {
      // Unique idempotency_key: a concurrent request already created it
      if (error.code === '23505') {
        const { data: winner } = await sb.from('payments').select('*').eq('idempotency_key', idempotencyKey).single();
        return NextResponse.json({ payment: winner, idempotent: true });
      }
      throw error;
    }

    // Ask the customer's phone for the money (USSD push + PIN)
    const tx = await provider.requestToPay({
      phone: momoPhone,
      amountUgx: job.pay,
      externalRef: idempotencyKey,
      narration: `Tukola: ${job.title}`,
    });

    await sb.from('payments').update({ provider_ref: tx.providerRef }).eq('id', payment.id);

    if (tx.status === 'failed') {
      await sb.from('payments').update({ status: 'refunded', refunded_at: new Date().toISOString() }).eq('id', payment.id);
      return NextResponse.json({ error: 'The MoMo debit was declined. Please try again.' }, { status: 402 });
    }

    return NextResponse.json({
      payment: { ...payment, provider_ref: tx.providerRef },
      ussdPushSent: true,
      message: 'Check the phone for the MoMo prompt and enter the PIN to approve.',
    }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/payments]', err);
    return NextResponse.json({ error: 'Payment could not be started. Please try again.' }, { status: 500 });
  }
}
