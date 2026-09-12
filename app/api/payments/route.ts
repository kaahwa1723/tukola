import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { getSessionUser } from '@/lib/session';
import { getPaymentProvider } from '@/lib/payments/provider';
import { normalizeUgPhone } from '@/lib/phone';
import { reportError } from '@/lib/error-report';

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
    // All payments for the job — milestone jobs have one per stage.
    // `payment` (latest) is kept for older clients; `payments` is the
    // full stage list for the payment panel.
    const { data: payments } = await sb
      .from('payments')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });

    const payment = payments?.[0] ?? null;
    if (!payment) return NextResponse.json({ payment: null, payments: [] });
    if (payment.payer_id !== user.id && payment.payee_id !== user.id) {
      return NextResponse.json({ error: 'Only the parties of this payment can view it' }, { status: 403 });
    }

    // Stage plan for milestone jobs (amounts are server-set at posting)
    const { data: milestones } = await sb
      .from('job_milestones')
      .select('id, idx, label, pct, amount_ugx, payment_id')
      .eq('job_id', jobId)
      .order('idx', { ascending: true });

    return NextResponse.json({ payment, payments: payments ?? [], milestones: milestones ?? [] });
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

    const { jobId, momoPhone: rawPhone, milestoneIdx: rawMilestoneIdx } = await req.json();
    const momoPhone = normalizeUgPhone(rawPhone);
    if (!jobId || !momoPhone) {
      return NextResponse.json({ error: 'jobId and a valid Uganda MoMo number are required' }, { status: 400 });
    }

    const sb = createServerSupabase();

    // Load the job; only its employer can fund it
    const { data: job } = await sb
      .from('jobs')
      .select('id, employer_id, pay, status, title, pricing_type')
      .eq('id', jobId)
      .maybeSingle();

    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    if (job.employer_id !== user.id) {
      return NextResponse.json({ error: 'Only the employer who posted this job can fund it' }, { status: 403 });
    }
    if (!job.pay || job.pay <= 0) {
      return NextResponse.json({ error: 'This job has no agreed pay amount' }, { status: 400 });
    }

    // ── Milestone jobs: fund ONE stage at a time ─────────────────────
    // The amount comes from the stage plan (job_milestones), never from
    // the client. Stages must be funded in order, and the next stage
    // only unlocks after the previous stage's payment is released.
    let milestone: { id: string; idx: number; label: string; amount_ugx: number } | null = null;
    if (job.pricing_type === 'milestone') {
      const milestoneIdx = Number(rawMilestoneIdx);
      if (!Number.isInteger(milestoneIdx) || milestoneIdx < 1) {
        return NextResponse.json({ error: 'milestoneIdx is required for stage-paid jobs' }, { status: 400 });
      }
      const { data: stages } = await sb
        .from('job_milestones')
        .select('id, idx, label, amount_ugx, payment_id')
        .eq('job_id', jobId)
        .order('idx', { ascending: true });
      milestone = (stages ?? []).find((s) => s.idx === milestoneIdx) ?? null;
      if (!milestone) {
        return NextResponse.json({ error: 'That payment stage does not exist for this job' }, { status: 404 });
      }
      // Previous stages must all be released before funding this one
      const earlier = (stages ?? []).filter((s) => s.idx < milestoneIdx);
      if (earlier.length > 0) {
        const { data: earlierPayments } = await sb
          .from('payments')
          .select('milestone_id, status')
          .eq('job_id', jobId)
          .in('milestone_id', earlier.map((s) => s.id));
        const releasedIds = new Set(
          (earlierPayments ?? []).filter((p) => p.status === 'released').map((p) => p.milestone_id)
        );
        if (!earlier.every((s) => releasedIds.has(s.id))) {
          return NextResponse.json(
            { error: 'The previous stage must be confirmed and paid before you can fund this one.' },
            { status: 409 }
          );
        }
      }
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

    // Where the fundi's money goes on release: their saved payout
    // number, falling back to their login phone (for most fundis
    // MoMo == their phone). Stored on the ledger row so a later
    // profile change can't redirect an in-flight payment.
    const { data: payeeProfile } = await sb
      .from('profiles')
      .select('phone, momo_payout_phone')
      .eq('id', payeeId)
      .maybeSingle();
    const payeeMomoPhone = payeeProfile?.momo_payout_phone ?? payeeProfile?.phone ?? null;

    // Idempotency: one active payment per job (standard) or per stage
    // (milestone). Re-submitting returns the existing payment instead
    // of double-charging.
    let existingQuery = sb
      .from('payments')
      .select('*')
      .eq('job_id', jobId)
      .neq('status', 'refunded')
      .order('created_at', { ascending: false })
      .limit(1);
    if (milestone) existingQuery = existingQuery.eq('milestone_id', milestone.id);
    else existingQuery = existingQuery.is('milestone_id', null);
    const { data: existing } = await existingQuery.maybeSingle();
    if (existing) {
      return NextResponse.json({ payment: existing, idempotent: true });
    }

    const amountUgx = milestone ? milestone.amount_ugx : job.pay;
    const provider = getPaymentProvider();
    const idempotencyKey = milestone ? `pay_${jobId}_m${milestone.idx}` : `pay_${jobId}`;

    // Create the escrow row first (money moves only against a ledger row)
    const { data: payment, error } = await sb
      .from('payments')
      .insert({
        job_id: jobId,
        payer_id: user.id,
        payee_id: payeeId,
        amount: amountUgx,
        status: 'pending',
        provider: provider.name,
        idempotency_key: idempotencyKey,
        payer_momo_phone: momoPhone,
        payee_momo_phone: payeeMomoPhone,
        ...(milestone ? { milestone_id: milestone.id } : {}),
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
      amountUgx,
      externalRef: idempotencyKey,
      narration: milestone
        ? `Tukola: ${job.title} — Stage ${milestone.idx} (${milestone.label})`
        : `Tukola: ${job.title}`,
    });

    await sb.from('payments').update({ provider_ref: tx.providerRef }).eq('id', payment.id);
    // Link the stage to its escrow payment so status can be derived
    if (milestone) {
      await sb.from('job_milestones').update({ payment_id: payment.id }).eq('id', milestone.id);
    }

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
    reportError('payments.fund', err, { route: 'POST /api/payments' });
    return NextResponse.json({ error: 'Payment could not be started. Please try again.' }, { status: 500 });
  }
}
