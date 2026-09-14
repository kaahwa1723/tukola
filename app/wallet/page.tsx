'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wallet, Plus, ArrowDownLeft, ArrowUpRight, Clock, CheckCircle, XCircle, ChevronLeft, Smartphone, PiggyBank } from 'lucide-react';
import { useKola } from '@/lib/store';
import { useI18n } from '@/lib/i18n';
import { formatUgx } from '@/lib/pricing';

interface Entry { id: number; kind: string; amount_ugx: number; note: string | null; created_at: string; }
interface Topup { id: number; amount_ugx: number; status: string; created_at: string; }

export default function WalletPage() {
  const { user, updateUser } = useKola();
  const { t } = useI18n();
  const router = useRouter();

  const [balance, setBalance] = useState<number | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [topups, setTopups] = useState<Topup[]>([]);
  const [showLoad, setShowLoad] = useState(false);
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [justLoaded, setJustLoaded] = useState(false);
  const [withdrawBusy, setWithdrawBusy] = useState(false);
  const [withdrawMsg, setWithdrawMsg] = useState('');
  const [prefBusy, setPrefBusy] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/wallet');
      const data = await res.json().catch(() => null);
      if (res.ok && data) {
        setBalance(data.balance ?? 0);
        setEntries(data.entries ?? []);
        setTopups(data.topups ?? []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    setPhone(user?.phone ?? '');
    refresh();
  }, [user?.id, refresh]);

  // While any top-up is waiting for the MoMo PIN, poll until it settles
  const anyPending = topups.some((x) => x.status === 'pending');
  useEffect(() => {
    if (!anyPending) return;
    pollRef.current = setInterval(refresh, 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [anyPending, refresh]);

  // Celebrate a top-up that just landed
  const prevPending = useRef(0);
  useEffect(() => {
    const pendingNow = topups.filter((x) => x.status === 'pending').length;
    const succeeded = topups.some((x) => x.status === 'successful');
    if (prevPending.current > 0 && pendingNow === 0 && succeeded) {
      setJustLoaded(true);
      setShowLoad(false);
      setAmount('');
      setTimeout(() => setJustLoaded(false), 4000);
    }
    prevPending.current = pendingNow;
  }, [topups]);

  const startTopup = async () => {
    const amountUgx = Number(amount.replace(/[^\d]/g, ''));
    if (!amountUgx || busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/wallet/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountUgx, momoPhone: phone }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? t('common.networkError'));
      } else {
        refresh();
      }
    } catch {
      setError(t('common.networkError'));
    } finally {
      setBusy(false);
    }
  };

  const kindLabel = (kind: string) =>
    t(`wallet.kind.${kind}` as any) !== `wallet.kind.${kind}` ? t(`wallet.kind.${kind}` as any) : kind;

  const setPayoutPref = async (pref: 'momo' | 'wallet') => {
    if (!user || user.payoutPreference === pref || prefBusy) return;
    setPrefBusy(true);
    try {
      await updateUser({ payoutPreference: pref });
    } finally {
      setPrefBusy(false);
    }
  };

  const cashOut = async () => {
    if (withdrawBusy || !balance || balance <= 0) return;
    setWithdrawBusy(true);
    setWithdrawMsg('');
    try {
      const res = await fetch('/api/wallet/withdraw', { method: 'POST' });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setWithdrawMsg(data?.error ?? t('common.networkError'));
      } else {
        setWithdrawMsg(t('wallet.withdrawDone'));
        refresh();
      }
    } catch {
      setWithdrawMsg(t('common.networkError'));
    } finally {
      setWithdrawBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-nav lg:pb-0">
      <header className="sticky top-0 bg-white z-40 px-4 py-3 flex items-center gap-3 border-b border-slate-100">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-50 active:bg-slate-100"
        >
          <ChevronLeft size={24} className="text-blue-600" />
        </button>
        <h1 className="font-bold text-slate-900">{t('wallet.title')}</h1>
      </header>

      <div className="px-4 lg:px-6 py-5 space-y-4 max-w-2xl lg:mx-auto">
        {/* Balance card */}
        <div className="rounded-3xl p-6 text-white shadow-lg"
          style={{ background: 'linear-gradient(135deg,#00C8FF 0%,#2952E8 55%,#1A2DB8 100%)' }}>
          <div className="flex items-center gap-2 mb-1 opacity-80">
            <Wallet size={16} />
            <p className="text-xs font-semibold uppercase tracking-wide">{t('wallet.balance')}</p>
          </div>
          <p className="text-4xl font-black mb-4">
            {balance === null ? '…' : formatUgx(balance)}
          </p>
          {justLoaded && (
            <p className="flex items-center gap-1.5 text-sm font-bold mb-3">
              <CheckCircle size={16} /> {t('wallet.success')}
            </p>
          )}
          <button
            onClick={() => setShowLoad(!showLoad)}
            className="flex items-center gap-2 bg-white text-blue-700 font-bold text-sm px-5 py-3 rounded-2xl active:scale-95 transition-transform"
          >
            <Plus size={16} strokeWidth={3} /> {t('wallet.load')}
          </button>
        </div>

        {/* Load form */}
        {showLoad && (
          <div className="bg-white rounded-2xl p-4 border border-blue-100 shadow-sm animate-slide-up">
            <h3 className="font-bold text-slate-900 mb-3">{t('wallet.loadTitle')}</h3>
            <input
              type="tel"
              inputMode="numeric"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder={t('wallet.amountPh')}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 mb-2"
            />
            <input
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder={t('wallet.phonePh')}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 mb-3"
            />
            {anyPending ? (
              <p className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-sm font-semibold">
                <Clock size={15} className="animate-pulse" /> {t('wallet.waiting')}
              </p>
            ) : (
              <button
                onClick={startTopup}
                disabled={busy || !amount.trim()}
                className="w-full py-3.5 rounded-2xl font-bold text-white active:scale-95 transition-transform disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#2952E8,#1A2DB8)' }}
              >
                {busy ? '…' : t('wallet.loadCta')}
              </button>
            )}
            {error && <p className="text-red-500 text-xs font-medium mt-2">{error}</p>}
          </div>
        )}

        {/* Honest usage note */}
        <p className="text-slate-500 text-[12px] leading-snug px-1">{t('wallet.note')}</p>

        {/* Worker: where released pay goes + cash out */}
        {user?.role === 'worker' && (
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
            <h3 className="font-bold text-slate-900">{t('wallet.prefTitle')}</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setPayoutPref('momo')}
                disabled={prefBusy}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 px-3 py-3 text-center transition-all ${
                  (user.payoutPreference ?? 'momo') === 'momo'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-slate-100 bg-slate-50'
                }`}
              >
                <Smartphone size={18} className={(user.payoutPreference ?? 'momo') === 'momo' ? 'text-blue-600' : 'text-slate-400'} />
                <span className="text-xs font-bold text-slate-800">{t('wallet.prefMomo')}</span>
              </button>
              <button
                onClick={() => setPayoutPref('wallet')}
                disabled={prefBusy}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 px-3 py-3 text-center transition-all ${
                  user.payoutPreference === 'wallet'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-slate-100 bg-slate-50'
                }`}
              >
                <PiggyBank size={18} className={user.payoutPreference === 'wallet' ? 'text-blue-600' : 'text-slate-400'} />
                <span className="text-xs font-bold text-slate-800">{t('wallet.prefWallet')}</span>
              </button>
            </div>
            {balance !== null && balance > 0 && (
              <button
                onClick={cashOut}
                disabled={withdrawBusy}
                className="w-full py-3 rounded-2xl font-bold text-white text-sm active:scale-95 transition-transform disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#2952E8,#1A2DB8)' }}
              >
                {withdrawBusy ? '…' : `${t('wallet.withdraw')} · ${formatUgx(balance)}`}
              </button>
            )}
            {withdrawMsg && (
              <p className={`text-xs font-medium ${withdrawMsg === t('wallet.withdrawDone') ? 'text-green-600' : 'text-red-500'}`}>
                {withdrawMsg}
              </p>
            )}
            <p className="text-slate-400 text-[11px] leading-snug">{t('wallet.feeTip')}</p>
          </div>
        )}

        {/* History */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <h3 className="font-bold text-slate-900 px-4 pt-4 pb-2">{t('wallet.history')}</h3>
          {entries.length === 0 && topups.length === 0 ? (
            <p className="text-slate-400 text-sm px-4 pb-5">{t('wallet.empty')}</p>
          ) : (
            <div>
              {topups.filter((x) => x.status !== 'successful').slice(0, 3).map((x) => (
                <div key={`t${x.id}`} className="flex items-center gap-3 px-4 py-3 border-t border-slate-50">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${x.status === 'pending' ? 'bg-amber-50' : 'bg-red-50'}`}>
                    {x.status === 'pending'
                      ? <Clock size={14} className="text-amber-600 animate-pulse" />
                      : <XCircle size={14} className="text-red-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{kindLabel('topup')}</p>
                    <p className="text-[11px] text-slate-400">
                      {x.status === 'pending' ? t('wallet.pendingTopup') : t('wallet.failed')}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-slate-500">{formatUgx(x.amount_ugx)}</p>
                </div>
              ))}
              {entries.map((e) => (
                <div key={e.id} className="flex items-center gap-3 px-4 py-3 border-t border-slate-50">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${e.amount_ugx > 0 ? 'bg-green-50' : 'bg-slate-50'}`}>
                    {e.amount_ugx > 0
                      ? <ArrowDownLeft size={14} className="text-green-600" />
                      : <ArrowUpRight size={14} className="text-slate-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{kindLabel(e.kind)}</p>
                    <p className="text-[11px] text-slate-400">
                      {new Date(e.created_at).toLocaleDateString([], { day: 'numeric', month: 'short' })}
                      {e.note ? ` · ${e.note}` : ''}
                    </p>
                  </div>
                  <p className={`text-sm font-bold ${e.amount_ugx > 0 ? 'text-green-600' : 'text-slate-700'}`}>
                    {e.amount_ugx > 0 ? '+' : ''}{formatUgx(e.amount_ugx)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
