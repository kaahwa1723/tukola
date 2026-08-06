'use client';

import { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, Banknote, AlertTriangle, Camera, CheckCircle, Clock } from 'lucide-react';
import { UploadImagePicker } from './UploadImagePicker';
import type { Job, User } from '@/lib/types';

interface Payment {
  id: number;
  status: 'pending' | 'held' | 'released' | 'refunded' | 'disputed';
  amount: number;
  receipt_number?: string | null;
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
 * Worker:  "Mark job done" (+ photo when pay > UGX 100K) — starts the
 *          48h auto-release clock.
 * Employer: "Fund via MoMo" → wait for the customer's USSD+PIN →
 *          "Confirm & release" or "Dispute".
 *
 * All money state comes from the server; this panel never trusts the
 * client copy of the job.
 */
export function EscrowPanel({ job, user, isEmployer, isAcceptedWorker }: Props) {
  const [payment, setPayment] = useState<Payment | null>(null);
  const [workerDoneAt, setWorkerDoneAt] = useState<string | null>((job as any).workerDoneAt ?? null);
  const [momoPhone, setMomoPhone] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');

  const photoRequired = (job.pay ?? 0) > 100_000;

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/payments?jobId=${job.id}`);
      const data = await res.json().catch(() => null);
      if (res.ok) setPayment(data?.payment ?? null);
    } catch {}
  }, [job.id]);

  useEffect(() => { refresh(); }, [refresh]);

  // While a debit is pending, poll for the customer's PIN approval
  useEffect(() => {
    if (!payment || payment.status !== 'pending') return;
    const t = setInterval(async () => {
      try {
        const res = await fetch(`/api/payments/${payment.id}/status`);
        const data = await res.json().catch(() => null);
        if (data?.payment) setPayment(data.payment);
      } catch {}
    }, 4000);
    return () => clearInterval(t);
  }, [payment]);

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
      body: JSON.stringify({ jobId: job.id, momoPhone }),
    });
    const data = await res.json().catch(() => null);
    if (res.ok) {
      setPayment(data.payment);
      setNote('MoMo prompt sent — approve it on the phone with the PIN.');
    }
    return res;
  }, 'Could not start the payment.');

  const markDone = () => act(async () => {
    const res = await fetch(`/api/jobs/${job.id}/mark-done`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photoUrl }),
    });
    const data = await res.json().catch(() => null);
    if (res.ok) {
      setWorkerDoneAt(data.workerDoneAt);
      setNote('Marked done. The employer has 48 hours to confirm or dispute.');
    }
    return res;
  }, 'Could not mark the job done.');

  const confirmRelease = () => act(async () => {
    const res = await fetch(`/api/jobs/${job.id}/confirm-release`, { method: 'POST' });
    const data = await res.json().catch(() => null);
    if (res.ok) {
      setNote(data?.receiptNumber ? `Escrow released. Receipt ${data.receiptNumber}.` : 'Job confirmed.');
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
    held: { icon: <ShieldCheck size={14} />, text: 'Money held safely in escrow', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    released: { icon: <CheckCircle size={14} />, text: 'Paid out — receipt issued', cls: 'bg-green-50 text-green-700 border-green-200' },
    refunded: { icon: <Banknote size={14} />, text: 'Refunded to the customer', cls: 'bg-slate-50 text-slate-600 border-slate-200' },
    disputed: { icon: <AlertTriangle size={14} />, text: 'Frozen — under dispute review', cls: 'bg-red-50 text-red-700 border-red-200' },
  }[status]);

  return (
    <div className="bg-white rounded-2xl p-4 border border-blue-100 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck size={18} className="text-blue-600" />
        <h3 className="font-bold text-slate-900">Escrow Payment</h3>
      </div>

      {job.pay && (
        <p className="text-slate-600 text-sm mb-3">
          Amount: <span className="font-bold text-slate-900">UGX {job.pay.toLocaleString()}</span>
        </p>
      )}

      {payment && (
        <div className={`inline-flex items-center gap-1.5 text-xs font-semibold border rounded-full px-3 py-1.5 mb-3 ${statusBadge(payment.status)?.cls}`}>
          {statusBadge(payment.status)?.icon}
          {statusBadge(payment.status)?.text}
          {payment.status === 'released' && payment.receipt_number && (
            <span className="ml-1 font-bold">· {payment.receipt_number}</span>
          )}
        </div>
      )}

      {/* EMPLOYER: fund the job (no payment yet) */}
      {isEmployer && !payment && (
        <div className="space-y-2">
          <p className="text-slate-500 text-xs">
            Fund this job with Mobile Money. The worker&apos;s phone will get a MoMo prompt — money is held in escrow until you confirm the work.
          </p>
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
            {busy ? 'Sending MoMo prompt...' : `Fund UGX ${(job.pay ?? 0).toLocaleString()} via MoMo`}
          </button>
        </div>
      )}

      {/* EMPLOYER: payment held + worker done → confirm / dispute */}
      {isEmployer && payment?.status === 'held' && workerDoneAt && (
        <div className="space-y-2">
          <button
            onClick={confirmRelease}
            disabled={busy}
            className="w-full bg-green-600 text-white rounded-xl py-3 font-bold text-sm active:scale-95 transition-transform disabled:opacity-40"
          >
            {busy ? 'Releasing...' : 'Confirm & release payment'}
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
      )}

      {/* EMPLOYER: held but worker hasn't marked done yet */}
      {isEmployer && payment?.status === 'held' && !workerDoneAt && (
        <p className="text-slate-500 text-xs">Money is safe in escrow. Waiting for the worker to mark the job done.</p>
      )}

      {/* WORKER: mark done (tap 1) */}
      {isAcceptedWorker && !workerDoneAt && job.status !== 'completed' && (
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
            {busy ? 'Submitting...' : 'Mark job done'}
          </button>
          <p className="text-slate-400 text-[11px]">
            If the employer doesn&apos;t respond, escrow releases automatically 48 hours after you tap this.
          </p>
        </div>
      )}

      {isAcceptedWorker && workerDoneAt && !payment && (
        <p className="text-slate-500 text-xs">Marked done. Waiting for the employer to confirm.</p>
      )}

      {note && <p className="text-slate-600 text-xs font-medium mt-2">{note}</p>}
    </div>
  );
}
