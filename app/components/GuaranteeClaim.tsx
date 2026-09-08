'use client';

import { useEffect, useState } from 'react';
import { ShieldCheck, AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-react';
import type { GuaranteeClaim } from '@/lib/guarantee';
import { useI18n } from '@/lib/i18n';

const STATUS_LABEL_KEY: Record<string, string> = {
  submitted: 'gc.stSubmitted',
  under_review: 'gc.stReview',
  approved_redo: 'gc.stRedo',
  approved_refund: 'gc.stRefund',
  rejected: 'gc.stRejected',
};

const STATUS_STYLE: Record<string, { bg: string; color: string; Icon: any }> = {
  submitted:       { bg: '#EFF6FF', color: '#1D4ED8', Icon: Clock },
  under_review:    { bg: '#FFF7ED', color: '#C2410C', Icon: Clock },
  approved_redo:   { bg: '#F0FDF4', color: '#15803D', Icon: CheckCircle },
  approved_refund: { bg: '#F0FDF4', color: '#15803D', Icon: CheckCircle },
  rejected:        { bg: '#FEF2F2', color: '#B91C1C', Icon: XCircle },
};

/**
 * "Tukola Guarantee" block on the completed-job view (customer side).
 *
 * Shows the real claim for this job if one exists (from GET /api/claims —
 * server filters to the session user, so we only ever see our own).
 * Otherwise a one-tap form: reason only for now — photo upload is coming
 * (the API already accepts photo URLs; storage wiring lands later).
 * Nothing here is fabricated: no claim → form; claim → its true status.
 */
export default function GuaranteeClaimBlock({ jobId }: { jobId: string }) {
  const { t } = useI18n();
  const [claim, setClaim] = useState<GuaranteeClaim | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/claims')
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (cancelled) return;
        const mine = (data?.claims ?? []).find((c: GuaranteeClaim) => c.jobId === jobId);
        setClaim(mine ?? null);
        setLoaded(true);
      })
      .catch(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, [jobId]);

  const submit = async () => {
    if (submitting || !reason.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, reason: reason.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.claim) {
        setClaim(data.claim);
        setOpen(false);
      } else {
        setError(data.error || t('gc.submitError'));
      }
    } catch {
      setError(t('common.networkError'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!loaded) return null;

  const statusStyle = claim ? STATUS_STYLE[claim.status] : null;
  const statusLabelKey = claim ? STATUS_LABEL_KEY[claim.status] : null;

  return (
    <div className="bg-white rounded-3xl p-5 border border-blue-100/40 mb-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#2952E8,#1A2DB8)' }}>
          <ShieldCheck size={18} className="text-white" />
        </div>
        <div className="min-w-0">
          <h2 className="text-slate-900 font-black text-sm">{t('gc.title')}</h2>
          <p className="text-slate-500 text-xs leading-snug mt-0.5">
            {t('gc.subtitle')}
          </p>
        </div>
      </div>

      {claim && statusStyle ? (
        <div className="rounded-xl p-3.5 mt-2" style={{ background: statusStyle.bg }}>
          <p className="flex items-center gap-1.5 text-sm font-bold" style={{ color: statusStyle.color }}>
            <statusStyle.Icon size={14} /> {statusLabelKey ? t(statusLabelKey) : claim.status}
          </p>
          <p className="text-slate-600 text-xs mt-1.5 leading-relaxed">{claim.reason}</p>
          {claim.amountApproved != null && claim.amountApproved > 0 && (
            <p className="text-xs font-bold mt-1.5" style={{ color: statusStyle.color }}>
              {t('gc.approvedAmount', { amount: claim.amountApproved.toLocaleString() })}
            </p>
          )}
          {claim.resolutionNote && (
            <p className="text-slate-500 text-xs mt-1.5 italic">{t('gc.note', { note: claim.resolutionNote })}</p>
          )}
        </div>
      ) : !open ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full mt-2 py-3 rounded-xl text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 active:scale-[0.98] transition-all">
          {t('gc.fileClaim')}
        </button>
      ) : (
        <div className="mt-3 space-y-2.5">
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={3}
            placeholder={t('gc.placeholder')}
            className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
          />
          <p className="text-slate-400 text-[11px] flex items-center gap-1">
            <AlertCircle size={11} /> {t('gc.photoNote')}
          </p>
          {error && (
            <p className="text-red-600 text-xs font-semibold bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={submit}
              disabled={submitting || !reason.trim()}
              className="flex-1 py-3 rounded-xl text-white text-sm font-bold active:scale-[0.98] transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#2952E8,#1A2DB8)' }}>
              {submitting ? t('gc.submitting') : t('gc.submit')}
            </button>
            <button
              onClick={() => { setOpen(false); setError(null); }}
              className="px-4 py-3 rounded-xl text-sm font-semibold text-slate-500 bg-slate-50 hover:bg-slate-100 transition-colors">
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
