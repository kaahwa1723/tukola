'use client';

import { useEffect, useState } from 'react';
import { Gift, Share2, Wallet, Users } from 'lucide-react';

interface ReferralSummary {
  code: string | null;
  creditBalanceUgx: number;
  referralCount: number;
  rewards:
    | { kind: 'customer'; bothSidesUgx: number }
    | { kind: 'fundi'; referrerUgx: number; refereeUgx: number };
}

/**
 * "Invite & earn" block (Phase 2 referrals).
 *
 * Shows the user's real referral code, their ledger-summed credit balance
 * and referral count from GET /api/referrals — nothing is fabricated;
 * while the request is in flight (or if it fails) the block simply
 * renders nothing rather than fake numbers.
 *
 * The share link carries ?ref=<code> to the landing page, which stores it
 * in localStorage (see app/page.tsx); the OTP signup flow then forwards
 * it to /api/auth/register for server-side attribution.
 */
export default function InviteEarn() {
  const [summary, setSummary] = useState<ReferralSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/referrals')
      .then(r => (r.ok ? r.json() : null))
      .then(data => { if (!cancelled && data?.code) setSummary(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (!summary?.code) return null;

  const signupLink =
    typeof window !== 'undefined'
      ? `${window.location.origin}/?ref=${summary.code}`
      : `/?ref=${summary.code}`;

  const howItWorks =
    summary.rewards.kind === 'customer'
      ? `Invite a household — when their first paid job completes, you both get UGX ${summary.rewards.bothSidesUgx.toLocaleString()} credit off Tukola commission.`
      : `Invite a fundi — when they complete their first paid job, you get UGX ${summary.rewards.referrerUgx.toLocaleString()} and they get UGX ${summary.rewards.refereeUgx.toLocaleString()} credit.`;

  const shareText = encodeURIComponent(
    `Join me on Tukola — find trusted fundis in Kampala (or get hired). Use my referral code ${summary.code}: ${signupLink}`
  );

  const handleShare = () => {
    // Fire-and-forget share tracking — never blocks the WhatsApp open
    fetch('/api/referrals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: 'whatsapp' }),
    }).catch(() => {});
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#2952E8,#1A2DB8)' }}>
          <Gift size={18} className="text-white" />
        </div>
        <div className="min-w-0">
          <h2 className="text-slate-900 font-black text-sm">Invite &amp; earn</h2>
          <p className="text-slate-500 text-xs leading-snug mt-0.5">{howItWorks}</p>
        </div>
      </div>

      {/* Code + stats */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 rounded-xl px-4 py-3 text-center"
          style={{ background: '#F0F4FF', border: '1.5px dashed rgba(41,82,232,0.35)' }}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#8B94B8]">Your code</p>
          <p className="text-lg font-black tracking-[0.2em] text-[#0A0F2C]">{summary.code}</p>
        </div>
        <div className="rounded-xl px-3 py-3 text-center bg-green-50 border border-green-100">
          <Wallet size={13} className="text-green-600 mx-auto" />
          <p className="text-sm font-black text-green-700 mt-0.5">
            {summary.creditBalanceUgx > 0 ? `UGX ${summary.creditBalanceUgx.toLocaleString()}` : '—'}
          </p>
          <p className="text-[9px] font-bold uppercase tracking-wide text-green-600">Credit</p>
        </div>
        <div className="rounded-xl px-3 py-3 text-center bg-blue-50 border border-blue-100">
          <Users size={13} className="text-blue-600 mx-auto" />
          <p className="text-sm font-black text-blue-700 mt-0.5">{summary.referralCount}</p>
          <p className="text-[9px] font-bold uppercase tracking-wide text-blue-600">Invited</p>
        </div>
      </div>

      <a
        href={`https://wa.me/?text=${shareText}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleShare}
        className="w-full py-3 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] hover:opacity-90"
        style={{ background: 'linear-gradient(135deg,#25D366,#128C7E)', boxShadow: '0 4px 16px rgba(18,140,126,0.3)' }}
      >
        <Share2 size={15} />
        Share on WhatsApp
      </a>
    </div>
  );
}
