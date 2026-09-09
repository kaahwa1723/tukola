import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { getSessionUser } from '@/lib/session';
import { transitionPayment } from '@/lib/escrow';
import { track } from '@/lib/analytics';
import { sendDisputeOpenedEmail } from '@/lib/email/notify';

type Params = { params: { id: string } };

/**
 * POST /api/jobs/[id]/dispute
 * Body: { reason }
 *
 * Either job party (employer or accepted worker) can open a dispute.
 * The escrowed payment freezes in 'disputed' — funds stay held until an
 * admin resolves it from the admin dispute queue.
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { reason } = await req.json();
    if (!reason?.trim()) {
      return NextResponse.json({ error: 'A reason is required to open a dispute' }, { status: 400 });
    }

    const sb = createServerSupabase();
    const { data: job } = await sb
      .from('jobs')
      .select('id, employer_id')
      .eq('id', params.id)
      .maybeSingle();

    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    // Must be a job party
    const isEmployer = job.employer_id === user.id;
    const { data: accepted } = await sb
      .from('applications')
      .select('worker_id')
      .eq('job_id', params.id)
      .eq('worker_id', user.id)
      .eq('status', 'accepted')
      .limit(1);
    if (!isEmployer && !accepted?.length) {
      return NextResponse.json({ error: 'Only the job parties can open a dispute' }, { status: 403 });
    }

    // The job's payment freezes (if there is one and it is held)
    const { data: payment } = await sb
      .from('payments')
      .select('id, status')
      .eq('job_id', params.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // One open dispute per job
    const { data: openDispute } = await sb
      .from('disputes')
      .select('id')
      .eq('job_id', params.id)
      .eq('status', 'open')
      .limit(1)
      .maybeSingle();
    if (openDispute) {
      return NextResponse.json({ success: true, disputeId: openDispute.id, alreadyOpen: true });
    }

    if (!payment) {
      return NextResponse.json({ error: 'There is no payment on this job to dispute' }, { status: 409 });
    }
    if (payment.status !== 'held') {
      return NextResponse.json(
        { error: `This payment cannot be disputed (it is ${payment.status})` },
        { status: 409 }
      );
    }

    await transitionPayment(payment.id, 'disputed');

    const { data: dispute, error } = await sb
      .from('disputes')
      .insert({
        payment_id: payment.id,
        job_id: params.id,
        opened_by: user.id,
        reason: reason.trim(),
      })
      .select()
      .single();
    if (error) throw error;

    track('dispute_opened', user.id, { jobId: params.id, paymentId: payment.id });
    // Alert both job parties + the admin (ADMIN_EMAIL, when set) that the
    // payment is frozen — fire-and-forget safe, never fails the dispute.
    await sendDisputeOpenedEmail({
      partyIds: [job.employer_id, user.id],
      jobId: params.id,
      reason: reason.trim(),
    });
    return NextResponse.json({
      success: true,
      disputeId: dispute.id,
      message: 'Dispute opened. The payment is frozen until our team reviews it.',
    }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/jobs/[id]/dispute]', err);
    return NextResponse.json({ error: 'Could not open the dispute. Please try again.' }, { status: 500 });
  }
}
