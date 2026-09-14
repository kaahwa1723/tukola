'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, Banknote, AlertTriangle, Camera, CheckCircle, Clock, CircleDashed } from 'lucide-react';
import { UploadImagePicker } from './UploadImagePicker';
import type { Job, User } from '@/lib/types';
import { formatUgx } from '@/lib/pricing';
import { useI18n } from '@/lib/i18n';

interface Payment {
  id: number;
  status: 'pending' | 'held' | 'released' | 'refunded' | 'disputed';
  amount: number;
  receipt_number?: string | null;
  milestone_id?: string | null;
}

interface Milestone {
  id: string;
  idx: number;
  label: string;
  pct: number;
  amount_ugx: number;
  payment_id: number | null;
}

interface Props {
  job: Job;
  user: User;
  isEmployer: boolean;
  isAcceptedWorker: boolean;
}

/**
 * EscrowPanel — the payment half of the two-tap completion flow.
 *
 * Standard jobs: one payment — fund → held → confirm & release.
 * Milestone jobs (pay ≥ UGX 300k): the same flow repeats per stage
 * (30% start/materials → 40% main work → 30% completion). The stage
 * list, amounts and status come from the server — this panel never
 * trusts the client copy of the job.
 *
 * Worker:  "Mark stage done" (+ photo when pay > UGX 100K).
 * Employer: "Fund stage via MoMo" → USSD+PIN → "Confirm & release stage".
 */
export function EscrowPanel({ job, user, isEmployer, isAcceptedWorker }: Props) {
  const { t } = useI18n();
  const [payment, setPayment] = useState<Payment | null>(null);       // latest (standard flow)
  const [payments, setPayments] = useState<Payment[]>([]);            // all (stage flow)
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loaded, setLoaded] = useState(false);                        // gate banners until first fetch lands
  const [workerDoneAt, setWorkerDoneAt] = useState<string | null>((job as any).workerDoneAt ?? null);
  const [momoPhone, setMomoPhone] = useState('');
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');

  const isMilestone = milestones.length > 0;
  const photoRequired = (job.pay ?? 0) > 100_000;

  // Stage status = the status of its linked payment ('unfunded' if none)
  const stageStatus = (m: Milestone): Payment['status'] | 'unfunded' => {
    const p = payments.find((pay) => pay.id === m.payment_id || pay.milestone_id === m.id);
    return p?.status ?? 'unfunded';
  };
  // The stage currently in play: first stage not yet released
  const currentStage = isMilestone
    ? milestones.find((m) => stageStatus(m) !== 'released') ?? null
    : null;
  const currentPayment = currentStage
    ? payments.find((p) => p.id === currentStage.payment_id || p.milestone_id === currentStage.id) ?? null
    : null;

  // Loophole B: work is in progress but no money is secured yet.
  // Standard flow: no payment row at all. Stage flow: current stage unfunded.
  // 'pending' (waiting for the MoMo PIN) already counts as "being secured".
  const activeUnfunded = loaded && job.status === 'in_progress' && (
    isMilestone
      ? !!currentStage && stageStatus(currentStage) === 'unfunded'
      : !payment
  );

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/payments?jobId=${job.id}`);
      const data = await res.json().catch(() => null);
      if (res.ok) {
        setPayment(data?.payment ?? null);
        setPayments(data?.payments ?? []);
        setMilestones(data?.milestones ?? []);
        setLoaded(true);
      }
    } catch {}
  }, [job.id]);

  useEffect(() => { refresh(); }, [refresh]);

  // Employers: load wallet balance so "Pay from wallet" appears when it covers the stage
  useEffect(() => {
    if (!isEmployer) return;
    fetch('/api/wallet')
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d) setWalletBalance(d.balance ?? 0); })
      .catch(() => {});
  }, [isEmployer, payment, payments]);

  // While any debit is pending, poll for the customer's PIN approval
  const anyPending = payment?.status === 'pending' || payments.some((p) => p.status === 'pending');
  useEffect(() => {
    if (!anyPending) return;
    const t = setInterval(refresh, 4000);
    return () => clearInterval(t);
  }, [anyPending, refresh]);

  const act = async (fn: () => Promise<Response>, fallback: string) => {
    setBusy(true);
    setNote('');
    try {
      const res = await fn();
      const data = await res.json().catch(() => null);
      if (!res.ok) setNote(data?.error ?? fallback);
      return data;
    } catch {
      setNote('Network error. Please try again.');
      return null;
    } finally {
      setBusy(false);
    }
  };

  const fundJob = () => act(async () => {
    const res = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId: job.id,
        momoPhone,
        ...(currentStage ? { milestoneIdx: currentStage.idx } : {}),
      }),
    });
    const data = await res.json().catch(() => null);
    if (res.ok) {
      setNote('MoMo prompt sent — approve it on the phone with the PIN.');
      refresh();
    }
    return res;
  }, 'Could not start the payment.');

  // Wallet funding completes instantly — the money is already on-platform,
  // so the escrow row goes straight to 'held' with no USSD prompt.
  const fundFromWallet = () => act(async () => {
    const res = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId: job.id,
        source: 'wallet',
        ...(currentStage ? { milestoneIdx: currentStage.idx } : {}),
      }),
    });
    const data = await res.json().catch(() => null);
    if (res.ok) {
      setNote(t('esc.walletFunded'));
      refresh();
    }
    return res;
  }, 'Could not fund from the wallet.');

  const markDone = () => act(async () => {
    const res = await fetch(`/api/jobs/${job.id}/mark-done`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photoUrl }),
    });
    const data = await res.json().catch(() => null);
    if (res.ok) {
      setWorkerDoneAt(data.workerDoneAt);
      setPhotoUrl(null);
      setNote(isMilestone
        ? 'Stage marked done. The employer has 48 hours to confirm or dispute.'
        : 'Marked done. The employer has 48 hours to confirm or dispute.');
    }
    return res;
  }, 'Could not mark the job done.');

  const confirmRelease = () => act(async () => {
    const res = await fetch(`/api/jobs/${job.id}/confirm-release`, { method: 'POST' });
    const data = await res.json().catch(() => null);
    if (res.ok) {
      setWorkerDoneAt(null); // server resets it for the next stage
      setNote(
        data?.stagesRemaining > 0
          ? `Stage paid${data?.receiptNumber ? ` (receipt ${data.receiptNumber})` : ''}. ${data.stagesRemaining} stage${data.stagesRemaining > 1 ? 's' : ''} left — fund the next one when ready.`
          : data?.receiptNumber
            ? `Payment released. Receipt ${data.receiptNumber}.`
            : 'Job confirmed.'
      );
      refresh();
    }
    return res;
  }, 'Could not release the payment.');

  const openDispute = () => act(async () => {
    const res = await fetch(`/api/jobs/${job.id}/dispute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: disputeReason }),
    });
    const data = await res.json().catch(() => null);
    if (res.ok) {
      setNote('Dispute opened. The payment is frozen until our team reviews it.');
      setDisputeOpen(false);
      refresh();
    }
    return res;
  }, 'Could not open the dispute.');

  if (!isEmployer && !isAcceptedWorker) return null;

  const statusBadge = (status: string) => ({
    pending: { icon: <Clock size={14} />, text: 'Waiting for MoMo PIN approval', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    held: { icon: <ShieldCheck size={14} />, text: 'Money held safely by Tukola', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    released: { icon: <CheckCircle size={14} />, text: 'Paid out — receipt issued', cls: 'bg-green-50 text-green-700 border-green-200' },
    refunded: { icon: <Banknote size={14} />, text: 'Refunded to the customer', cls: 'bg-slate-50 text-slate-600 border-slate-200' },
    disputed: { icon: <AlertTriangle size={14} />, text: 'Frozen — under dispute review', cls: 'bg-red-50 text-red-700 border-red-200' },
    unfunded: { icon: <CircleDashed size={14} />, text: 'Not funded yet', cls: 'bg-slate-50 text-slate-500 border-slate-200' },
  }[status]);

  // ── Shared action blocks ──────────────────────────────────────────
  const activePayment = isMilestone ? currentPayment : payment;
  const activeAmount = isMilestone && currentStage ? currentStage.amount_ugx : (job.pay ?? 0);

  const fundBlock = (
    <div className="space-y-2">
      <p className="text-slate-500 text-xs">
        {isMilestone && currentStage
          ? `Fund Stage ${currentStage.idx} of ${milestones.length} — "${currentStage.label}". The money is held safely by Tukola and the fundi is paid only when you confirm this stage.`
          : 'Fund this job with Mobile Money. The money is held safely by Tukola until you confirm the work.'}
      </p>

      {/* Wallet funding — instant, no PIN. Only when the balance covers it. */}
      {walletBalance !== null && walletBalance >= activeAmount && activeAmount > 0 && (
        <button
          onClick={fundFromWallet}
          disabled={busy}
          className="w-full text-white rounded-xl py-3 font-bold text-sm active:scale-95 transition-transform disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg,#00C8FF,#2952E8)' }}
        >
          {busy ? '…' : `${t('esc.useWallet')} (${formatUgx(walletBalance)})`}
        </button>
      )}
      {walletBalance !== null && walletBalance < activeAmount && (
        <Link href="/wallet" className="block text-center text-blue-600 text-xs font-semibold">
          {t('esc.walletLow', { bal: formatUgx(walletBalance) })}
        </Link>
      )}

      <input
        type="tel"
        inputMode="numeric"
        value={momoPhone}
        onChange={e => setMomoPhone(e.target.value.replace(/[^\d+]/g, '').slice(0, 13))}
        placeholder="MoMo number e.g. 0772 123 456"
        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
      />
      <button
        onClick={fundJob}
        disabled={busy || momoPhone.replace(/\D/g, '').length < 9}
        className="w-full bg-blue-600 text-white rounded-xl py-3 font-bold text-sm active:scale-95 transition-transform disabled:opacity-40"
      >
        {busy ? 'Sending MoMo prompt...' : `Fund ${formatUgx(activeAmount)} via MoMo`}
      </button>
    </div>
  );

  const confirmBlock = (
    <div className="space-y-2">
      <button
        onClick={confirmRelease}
        disabled={busy}
        className="w-full bg-green-600 text-white rounded-xl py-3 font-bold text-sm active:scale-95 transition-transform disabled:opacity-40"
      >
        {busy ? 'Releasing...' : isMilestone && currentStage ? `Confirm & pay Stage ${currentStage.idx}` : 'Confirm & release payment'}
      </button>
      {!disputeOpen ? (
        <button onClick={() => setDisputeOpen(true)} className="w-full text-red-500 text-xs font-semibold py-1">
          Something wrong? Open a dispute
        </button>
      ) : (
        <div className="space-y-2">
          <textarea
            value={disputeReason}
            onChange={e => setDisputeReason(e.target.value)}
            rows={2}
            placeholder="Describe the problem..."
            className="w-full border border-red-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-400 resize-none"
          />
          <button
            onClick={openDispute}
            disabled={busy || !disputeReason.trim()}
            className="w-full bg-red-500 text-white rounded-xl py-2.5 font-bold text-sm disabled:opacity-40"
          >
            Freeze payment & open dispute
          </button>
        </div>
      )}
    </div>
  );

  const markDoneBlock = (
    <div className="space-y-2">
      {photoRequired && (
        <div>
          <p className="text-slate-500 text-xs mb-1.5 flex items-center gap-1">
            <Camera size={12} /> Photo of completed work (required above UGX 100,000)
          </p>
          <UploadImagePicker
            images={photoUrl ? [photoUrl] : []}
            onChange={(imgs: string[]) => setPhotoUrl(imgs[0] ?? null)}
            maxImages={1}
            bucket="job-images"
          />
        </div>
      )}
      <button
        onClick={markDone}
        disabled={busy || (photoRequired && !photoUrl)}
        className="w-full bg-blue-600 text-white rounded-xl py-3 font-bold text-sm active:scale-95 transition-transform disabled:opacity-40"
      >
        {busy ? 'Submitting...' : isMilestone && currentStage ? `Mark Stage ${currentStage.idx} done` : 'Mark job done'}
      </button>
      <p className="text-slate-400 text-[11px]">
        If the employer doesn&apos;t respond, payment releases automatically 48 hours after you tap this.
      </p>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl p-4 border border-blue-100 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck size={18} className="text-blue-600" />
        <h3 className="font-bold text-slate-900">{isMilestone ? 'Payment stages' : 'Payment protection'}</h3>
      </div>

      {/* Unfunded-work nudge: worker waits, employer funds — before anyone lifts a tool */}
      {activeUnfunded && isAcceptedWorker && (
        <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 flex gap-2">
          <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[12px] text-amber-800 leading-snug">{t('esc.waitWorker')}</p>
        </div>
      )}
      {activeUnfunded && isEmployer && (
        <div className="mb-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5">
          <p className="text-[12px] text-blue-800 leading-snug">{t('esc.fundNudge')}</p>
        </div>
      )}

      {job.pay && (
        <p className="text-slate-600 text-sm mb-3">
          {isMilestone ? 'Total for the job: ' : 'Amount: '}
          <span className="font-bold text-slate-900">{formatUgx(job.pay)}</span>
          {isMilestone && <span className="text-slate-400"> · paid in {milestones.length} stages</span>}
        </p>
      )}

      {/* Milestone stage tracker — plain-language, statuses from server */}
      {isMilestone && (
        <div className="mb-4 space-y-1.5">
          {milestones.map((m) => {
            const st = stageStatus(m);
            const badge = statusBadge(st);
            const isCurrent = currentStage?.id === m.id;
            return (
              <div
                key={m.id}
                className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 ${
                  isCurrent ? 'border-blue-300 bg-blue-50/60' : 'border-slate-100 bg-slate-50/50'
                }`}
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">
                    Stage {m.idx} · {m.label}
                  </p>
                  <p className="text-[11px] text-slate-500">{formatUgx(m.amount_ugx)} ({m.pct}%)</p>
                </div>
                <span className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold border rounded-full px-2 py-1 ${badge?.cls}`}>
                  {badge?.icon}
                  {st === 'released' ? 'Paid' : st === 'held' ? 'Held safely' : st === 'pending' ? 'PIN pending' : st === 'disputed' ? 'Frozen' : 'Not funded'}
                </span>
              </div>
            );
          })}
          <p className="text-[11px] text-slate-400 pt-1">
            Each stage is funded separately. The fundi is paid for a stage only when you confirm it — then you fund the next one.
          </p>
        </div>
      )}

      {/* Standard job: single payment status badge */}
      {!isMilestone && payment && (
        <div className={`inline-flex items-center gap-1.5 text-xs font-semibold border rounded-full px-3 py-1.5 mb-3 ${statusBadge(payment.status)?.cls}`}>
          {statusBadge(payment.status)?.icon}
          {statusBadge(payment.status)?.text}
          {payment.status === 'released' && payment.receipt_number && (
            <span className="ml-1 font-bold">· {payment.receipt_number}</span>
          )}
        </div>
      )}

      {/* EMPLOYER: fund (no payment for the active stage yet) */}
      {isEmployer && !activePayment && !(isMilestone && !currentStage) && fundBlock}

      {/* EMPLOYER: all stages paid */}
      {isEmployer && isMilestone && !currentStage && (
        <p className="text-green-700 text-xs font-semibold flex items-center gap-1.5">
          <CheckCircle size={14} /> All stages paid. This job is complete.
        </p>
      )}

      {/* EMPLOYER: active stage held + worker done → confirm / dispute */}
      {isEmployer && activePayment?.status === 'held' && workerDoneAt && confirmBlock}

      {/* EMPLOYER: held but worker hasn't marked done yet */}
      {isEmployer && activePayment?.status === 'held' && !workerDoneAt && (
        <p className="text-slate-500 text-xs">
          Money is held safely. Waiting for the fundi to mark {isMilestone ? 'this stage' : 'the job'} done.
        </p>
      )}

      {/* EMPLOYER: pending debit */}
      {isEmployer && activePayment?.status === 'pending' && (
        <p className="text-amber-600 text-xs font-medium">Waiting for the MoMo PIN approval on the phone…</p>
      )}

      {/* WORKER: mark done (tap 1) — only once the active stage is funded */}
      {isAcceptedWorker && !workerDoneAt && job.status !== 'completed' && (!isMilestone || currentStage) &&
        (!isMilestone || (currentPayment && (currentPayment.status === 'held' || currentPayment.status === 'pending'))) &&
        markDoneBlock}

      {isAcceptedWorker && isMilestone && currentStage && !currentPayment && (
        <p className="text-slate-500 text-xs">
          Stage {currentStage.idx} &quot;{currentStage.label}&quot; is not funded yet — the employer funds it before you start.
        </p>
      )}

      {isAcceptedWorker && workerDoneAt && (
        <p className="text-slate-500 text-xs">Marked done. Waiting for the employer to confirm.</p>
      )}

      {note && <p className="text-slate-600 text-xs font-medium mt-2">{note}</p>}
    </div>
  );
}
