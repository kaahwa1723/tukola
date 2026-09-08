'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Gift, Users, Wallet, RefreshCw, ArrowRight, Coins } from 'lucide-react';

interface Referral {
  id: number;
  referrerName: string;
  refereeName: string;
  refereeRole: 'worker' | 'employer';
  code: string;
  status: 'pending' | 'rewarded';
  createdAt: string;
  rewardedAt?: string;
}

interface Totals {
  issuedUgx: number;
  redeemedUgx: number;
  expiredUgx: number;
  outstandingUgx: number;
  pendingCount: number;
  rewardedCount: number;
}

interface Balance {
  userId: string;
  name: string;
  phone: string;
  earnedUgx: number;
  redeemedUgx: number;
  expiredUgx: number;
  balanceUgx: number;
}

const ugx = (n: number) => `UGX ${n.toLocaleString()}`;

const dateFmt = (iso: string) =>
  new Date(iso).toLocaleDateString('en-UG', { month: 'short', day: 'numeric', year: 'numeric' });

/**
 * Admin referrals overview (read-only).
 * All figures come from GET /api/admin/referrals — live sums of the
 * referral credit ledger, never estimates.
 */
export default function AdminReferralsPage() {
  const router = useRouter();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/referrals');
      if (res.status === 401) { router.push('/admin/login'); return; }
      if (!res.ok) { setError('Could not load referrals. You may need to sign in again.'); return; }
      const data = await res.json();
      setReferrals(data.referrals ?? []);
      setTotals(data.totals ?? null);
      setBalances(data.balances ?? []);
    } catch {
      setError('Network error loading referrals.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const cards = [
    { label: 'Credit given out', value: totals ? ugx(totals.issuedUgx) : '—', sub: 'all credit entries earned from referrals', Icon: Gift, color: '#16A34A', bg: '#F0FDF4' },
    { label: 'Credit used', value: totals ? ugx(totals.redeemedUgx) : '—', sub: 'spent against the platform fee on payouts', Icon: Coins, color: '#2952E8', bg: '#EEF2FF' },
    { label: 'Credit still available', value: totals ? ugx(totals.outstandingUgx) : '—', sub: 'sitting in user balances right now', Icon: Wallet, color: '#D97706', bg: '#FFF7ED' },
    { label: 'Referrals waiting', value: totals ? totals.pendingCount : '—', sub: 'sign-ups attributed, reward not paid yet', Icon: Users, color: '#7C3AED', bg: '#F5F3FF' },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between animate-slide-up">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
            <Gift size={20} className="text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#0A0F2C]">Referrals</h1>
            <p className="text-slate-500 text-sm">
              Who referred whom, and how much referral credit is out there. Read-only — rewards pay out automatically.
            </p>
          </div>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-xl transition-colors disabled:opacity-60"
          style={{ background: '#EEF2FF', color: '#2952E8' }}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-semibold">
          {error}
        </div>
      )}

      {/* Credit totals */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-slide-up-d1">
        {cards.map(c => (
          <div key={c.label} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3" style={{ background: c.bg }}>
              <c.Icon size={18} color={c.color} />
            </div>
            <p className="text-xl font-black text-[#0A0F2C]">{c.value}</p>
            <p className="text-[#0A0F2C] font-semibold text-sm mt-0.5">{c.label}</p>
            <p className="text-slate-400 text-xs mt-0.5">{c.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Referral list */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 animate-slide-up-d2">
          <h2 className="font-black text-[#0A0F2C]">Every referral</h2>
          <p className="text-slate-400 text-xs mb-4">
            Newest first · {totals ? `${totals.rewardedCount} rewarded · ${totals.pendingCount} still waiting` : '—'}
          </p>
          {!loading && referrals.length === 0 && !error ? (
            <div className="empty-state">
              <div className="empty-icon"><Gift size={30} color="#2952E8" /></div>
              <p className="empty-title">No referrals yet</p>
              <p className="empty-sub">When someone signs up with a referral code, it will show up here — nothing to action.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {referrals.map(r => (
                <div key={r.id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#0A0F2C] text-sm flex items-center gap-1.5 flex-wrap">
                      <span className="truncate">{r.referrerName}</span>
                      <ArrowRight size={12} className="text-slate-300 flex-shrink-0" />
                      <span className="truncate">{r.refereeName}</span>
                    </p>
                    <p className="text-slate-400 text-xs">
                      Referred a {r.refereeRole === 'worker' ? 'fundi' : 'customer'} · code {r.code} · {dateFmt(r.createdAt)}
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0 ${
                    r.status === 'rewarded' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {r.status === 'rewarded' ? 'REWARD PAID' : 'WAITING'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Per-user balances */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 animate-slide-up-d3">
          <h2 className="font-black text-[#0A0F2C]">Credit balances per user</h2>
          <p className="text-slate-400 text-xs mb-4">
            Biggest balance first · balance = credit earned minus credit used
          </p>
          {!loading && balances.length === 0 && !error ? (
            <div className="empty-state">
              <div className="empty-icon"><Wallet size={30} color="#2952E8" /></div>
              <p className="empty-title">No credit balances yet</p>
              <p className="empty-sub">Balances appear once the first referral reward is paid out — nothing to action.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {balances.map(b => (
                <div key={b.userId} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg,#2952E8,#1A2DB8)' }}>
                    <span className="text-white font-bold text-sm">{b.name.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#0A0F2C] text-sm truncate">{b.name}</p>
                    <p className="text-slate-400 text-xs">
                      earned {ugx(b.earnedUgx)} · used {ugx(b.redeemedUgx)}
                      {b.expiredUgx > 0 ? ` · expired ${ugx(b.expiredUgx)}` : ''}
                    </p>
                  </div>
                  <p className="font-bold text-sm text-[#0A0F2C] flex-shrink-0">{ugx(b.balanceUgx)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
