'use client';

import { useState } from 'react';
import { AlertTriangle, ShieldOff, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

interface Props {
  jobId: string;
  /** Called after the settlement is recorded — parent should refresh + navigate. */
  onSettled: () => void;
}

/**
 * SettleOffPlatform — the honest cash path.
 *
 * We can't stop cash deals; we make the trade-off explicit instead.
 * Renders a discreet link under the escrow panel (in-progress, unfunded
 * jobs only — the parent decides visibility). Tapping it opens a modal
 * that lists exactly what BOTH sides lose, then confirms the close-out.
 * Repeat offenders see a suspension warning (server computes the count).
 */
export function SettleOffPlatform({ jobId, onSettled }: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const confirm = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/jobs/${jobId}/settle-off-platform`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: note.trim() || undefined }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? t('common.networkError'));
        setBusy(false);
        return;
      }
      if (data?.repeatOffender) {
        alert(t('off.repeat'));
      }
      onSettled();
    } catch {
      setError(t('common.networkError'));
      setBusy(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full text-center text-slate-400 text-xs font-medium underline underline-offset-2 active:opacity-70"
      >
        {t('off.link')}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 px-4 pb-4 sm:pb-0"
          onClick={() => !busy && setOpen(false)}>
          <div
            className="bg-white rounded-3xl w-full max-w-md p-5 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
                  <ShieldOff size={18} className="text-amber-600" />
                </div>
                <h3 className="font-black text-slate-900">{t('off.title')}</h3>
              </div>
              <button onClick={() => !busy && setOpen(false)} className="p-1 text-slate-400">
                <X size={18} />
              </button>
            </div>

            <ul className="space-y-2 mb-3">
              {(['off.b1', 'off.b2', 'off.b3', 'off.b4'] as const).map(k => (
                <li key={k} className="flex gap-2 text-[13px] text-slate-700 leading-snug">
                  <span className="text-amber-500 font-black">·</span>
                  {t(k)}
                </li>
              ))}
            </ul>

            <p className="text-[12px] font-semibold text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2 mb-3 flex gap-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              {t('off.warn')}
            </p>

            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              maxLength={140}
              placeholder={t('off.notePh')}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 mb-3"
            />

            {error && <p className="text-red-500 text-xs font-medium mb-3">{error}</p>}

            <button
              onClick={() => setOpen(false)}
              disabled={busy}
              className="w-full py-3.5 rounded-2xl font-bold text-white mb-2 active:scale-95 transition-transform"
              style={{ background: 'linear-gradient(135deg,#2952E8,#1A2DB8)' }}
            >
              {t('off.keep')}
            </button>
            <button
              onClick={confirm}
              disabled={busy}
              className="w-full py-3 rounded-2xl font-bold text-red-600 bg-red-50 border border-red-200 active:scale-95 transition-transform disabled:opacity-50"
            >
              {busy ? '…' : t('off.confirm')}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
