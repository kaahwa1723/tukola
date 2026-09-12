import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { getSessionUser } from '@/lib/session';
import { track } from '@/lib/analytics';
import { notifyUser } from '@/lib/notify';

type Params = { params: { id: string } };

/**
 * POST /api/jobs/[id]/settle-off-platform
 *
 * The honest answer to "what if they pay cash?": we can't stop it, so we
 * make it visible and costly. Either party (employer or accepted worker)
 * declares the job was settled outside Tukola. The job closes as
 * 'cancelled' + settled_off_platform — which means:
 *
 *   - NO escrow, guarantee, receipt, or rating applies to it
 *   - the reliability score's collapsed-booking penalty kicks in
 *   - a leakage_events row ('off_platform_settlement') lands in the
 *     admin leakage view, next to phone-number-in-chat signals
 *   - repeat settlements (60-day window) flag the user as a repeat
 *     offender in the response — the UI warns them about suspension
 *
 * Refused while money is pending/held — that MUST go through escrow
 * release/refund. The other party gets an SMS so one side can't quietly
 * close a job to dodge payment.
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Please log in first.' }, { status: 401 });
    }

    const jobId = params.id;
    const sb = createServerSupabase();

    const { data: job, error: jobErr } = await sb
      .from('jobs')
      .select('id, employer_id, title, status, settled_off_platform')
      .eq('id', jobId)
      .maybeSingle();
    if (jobErr) throw jobErr;
    if (!job) {
      return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
    }
    if (job.status === 'completed' || job.status === 'cancelled') {
      return NextResponse.json({ error: 'This job is already closed.' }, { status: 409 });
    }
    if (job.status !== 'in_progress') {
      return NextResponse.json(
        { error: 'Only a job with an accepted fundi can be settled this way.' },
        { status: 400 }
      );
    }

    // Only the two parties may declare a settlement
    const isEmployer = job.employer_id === user.id;
    let acceptedWorkerId: string | null = null;
    {
      const { data: appRow } = await sb
        .from('applications')
        .select('worker_id')
        .eq('job_id', jobId)
        .eq('status', 'accepted')
        .maybeSingle();
      acceptedWorkerId = appRow?.worker_id ?? null;
    }
    const isAcceptedWorker = acceptedWorkerId === user.id;
    if (!isEmployer && !isAcceptedWorker) {
      return NextResponse.json({ error: 'Only the job\'s employer or accepted fundi can do this.' }, { status: 403 });
    }

    // Money inside the system must move through escrow — never a cash flag
    const { data: activeMoney } = await sb
      .from('payments')
      .select('id')
      .eq('job_id', jobId)
      .in('status', ['pending', 'held'])
      .limit(1);
    if (activeMoney && activeMoney.length > 0) {
      return NextResponse.json(
        { error: 'Money is already protected in escrow for this job — release or refund it from the payment panel instead.' },
        { status: 400 }
      );
    }

    let note: string | null = null;
    try {
      const body = await req.json();
      note = typeof body?.note === 'string' && body.note.trim()
        ? body.note.trim().slice(0, 140)
        : null;
    } catch { /* note is optional */ }

    const { error: updErr } = await sb
      .from('jobs')
      .update({
        status: 'cancelled',
        settled_off_platform: true,
        settled_off_platform_by: user.id,
        settlement_note: note,
      })
      .eq('id', jobId);
    if (updErr) throw updErr;

    // Admin visibility — sits alongside chat leakage signals
    await sb.from('leakage_events').insert({
      conversation_id: null,
      job_id: jobId,
      from_id: user.id,
      matched: 'off_platform_settlement',
      had_captured_payment: false,
    });

    track('leakage_signal', user.id, {
      kind: 'off_platform_settlement',
      jobId,
      role: isEmployer ? 'employer' : 'worker',
    });

    // Repeat-offender count (60 days): settlements this user declared or
    // was a party to, as employer or as the accepted worker.
    const since = new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString();
    const { count: partyCount } = await sb
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .eq('settled_off_platform', true)
      .gte('created_at', since)
      .or(`settled_off_platform_by.eq.${user.id},employer_id.eq.${user.id}`);
    const { data: asWorker } = await sb
      .from('applications')
      .select('job_id, jobs!inner(settled_off_platform, created_at)')
      .eq('worker_id', user.id)
      .eq('status', 'accepted')
      .eq('jobs.settled_off_platform', true)
      .gte('jobs.created_at', since);
    const repeatCount = Math.max(partyCount ?? 0, (asWorker ?? []).length);
    const repeatOffender = repeatCount >= 2;

    // The other party must know the job closed — SMS, fire-and-forget
    const otherId = isEmployer ? acceptedWorkerId : job.employer_id;
    if (otherId) {
      notifyUser(sb, otherId,
        `Tukola: "${job.title}" was marked as settled outside the app. No payment protection applies. If this is wrong, contact support immediately.`
      ).catch(() => {});
    }

    return NextResponse.json({ ok: true, repeatCount, repeatOffender });
  } catch (err: any) {
    console.error('[POST /api/jobs/[id]/settle-off-platform]', err);
    return NextResponse.json({ error: 'Could not record the settlement. Please try again.' }, { status: 500 });
  }
}
