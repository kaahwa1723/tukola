import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { releasePayment } from '@/lib/escrow';
import { track } from '@/lib/analytics';
import { isCronAuthorized } from '@/lib/cron-auth';
import { recomputeReliabilityScore } from '@/lib/reliability';
import { issueReferralCreditsForCompletion } from '@/lib/referrals';

const AUTO_RELEASE_AFTER_MS = 48 * 60 * 60 * 1000; // 48 hours

/**
 * GET /api/cron/auto-release
 *
 * The 48h auto-release safety net: a fundi's work can never be held
 * hostage by an unresponsive employer. Any payment in 'held' whose job
 * was marked done more than 48h ago (with no dispute opened) releases
 * automatically with normal splits.
 *
 * Secured by CRON_SECRET (x-cron-secret header or Authorization: Bearer —
 * the latter is what Vercel Cron sends).
 */
export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const sb = createServerSupabase();
    const cutoff = new Date(Date.now() - AUTO_RELEASE_AFTER_MS).toISOString();

    // Held payments whose job was marked done >48h ago
    const { data: candidates } = await sb
      .from('payments')
      .select('id, job_id, jobs!inner(worker_done_at)')
      .eq('status', 'held')
      .lt('jobs.worker_done_at', cutoff);

    const released: number[] = [];
    const skipped: { id: number; reason: string }[] = [];

    for (const payment of candidates ?? []) {
      // Never auto-release a disputed payment
      const { data: openDispute } = await sb
        .from('disputes')
        .select('id')
        .eq('job_id', payment.job_id)
        .eq('status', 'open')
        .limit(1)
        .maybeSingle();

      if (openDispute) {
        skipped.push({ id: payment.id, reason: 'open dispute' });
        continue;
      }

      try {
        await releasePayment(payment.id);
        // Ensure the job closes out too
        await sb
          .from('jobs')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('id', payment.job_id)
          .neq('status', 'completed');
        track('job_completed', 'system', { jobId: payment.job_id, via: 'auto_release_48h' });
        // Trust field: an auto-released completion still counts for the fundi
        const { data: accepted } = await sb
          .from('applications')
          .select('worker_id')
          .eq('job_id', payment.job_id)
          .eq('status', 'accepted')
          .limit(1);
        if (accepted?.[0]?.worker_id) {
          await recomputeReliabilityScore(accepted[0].worker_id);
        }
        // Referral rewards (Phase 2): an auto-released completion counts
        // toward first-paid-job referral credits too (non-fatal)
        await issueReferralCreditsForCompletion(payment.job_id);
        released.push(payment.id);
      } catch (e: any) {
        skipped.push({ id: payment.id, reason: e.message });
      }
    }

    return NextResponse.json({
      checked: (candidates ?? []).length,
      released,
      skipped,
      ranAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[GET /api/cron/auto-release]', err);
    return NextResponse.json({ error: 'Auto-release job failed.' }, { status: 500 });
  }
}
