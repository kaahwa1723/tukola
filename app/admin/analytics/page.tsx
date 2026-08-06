'use client';

import { useEffect, useState } from 'react';
import {
  TrendingUp, Users, Briefcase, DollarSign, ShieldCheck, AlertTriangle,
  CheckCircle2, BarChart3, RefreshCw, Star, FileText, CreditCard,
  UserPlus, PhoneCall, Send, Handshake, Lock, Flag,
} from 'lucide-react';

interface Stats {
  totalUsers: number;
  totalWorkers: number;
  totalEmployers: number;
  totalJobs: number;
  openJobs: number;
  activeJobs: number;
  completedJobs: number;
}

interface Funnel {
  signup: number;
  otp_verified: number;
  job_posted: number;
  application_sent: number;
  applicant_accepted: number;
  payment_held: number;
  job_completed: number;
  payment_released: number;
  rating_submitted: number;
  dispute_opened: number;
}

interface FunnelResponse {
  weekStarting: string;
  funnel: Funnel;
  metrics: {
    completionRate: number;
    disputeRate: number;
    gmvUgx: number;
    commissionRevenueUgx: number;
    guaranteeReserveBalanceUgx: number;
    repeatHireRate90d: number;
    hiringEmployers90d: number;
    repeatEmployers90d: number;
    leakageSignals: number;
  };
}

const FUNNEL_STEPS: { key: keyof Funnel; label: string; Icon: any }[] = [
  { key: 'signup',             label: 'Sign-ups',            Icon: UserPlus },
  { key: 'otp_verified',       label: 'Phones verified',     Icon: PhoneCall },
  { key: 'job_posted',         label: 'Jobs posted',         Icon: FileText },
  { key: 'application_sent',   label: 'Applications sent',   Icon: Send },
  { key: 'applicant_accepted', label: 'Applicants accepted', Icon: Handshake },
  { key: 'payment_held',       label: 'Payments held',       Icon: Lock },
  { key: 'job_completed',      label: 'Jobs completed',      Icon: CheckCircle2 },
  { key: 'payment_released',   label: 'Payments released',   Icon: CreditCard },
  { key: 'rating_submitted',   label: 'Ratings submitted',   Icon: Star },
  { key: 'dispute_opened',     label: 'Disputes opened',     Icon: Flag },
];

const ugx = (n: number) => `UGX ${n.toLocaleString()}`;

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [funnelData, setFunnelData] = useState<FunnelResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, funnelRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/funnel'),
      ]);
      if (!statsRes.ok || !funnelRes.ok) {
        setError('Could not load analytics. You may need to sign in again.');
        return;
      }
      setStats(await statsRes.json());
      setFunnelData(await funnelRes.json());
    } catch {
      setError('Network error loading analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const funnel = funnelData?.funnel;
  const metrics = funnelData?.metrics;
  const maxFunnel = funnel ? Math.max(...FUNNEL_STEPS.map(s => funnel[s.key]), 1) : 1;
  const weekLabel = funnelData
    ? new Date(funnelData.weekStarting).toLocaleDateString('en-UG', { month: 'short', day: 'numeric' })
    : '';

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between animate-slide-up">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <TrendingUp size={20} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#0A0F2C]">Analytics</h1>
            <p className="text-slate-500 text-sm">Real numbers from the live database — nothing is estimated.</p>
          </div>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-semibold">
          {error}
        </div>
      )}

      {/* KPI row — real lifetime counts, no invented growth badges */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-slide-up-d1">
        {[
          { label: 'Total Users', value: stats?.totalUsers, sub: stats ? `${stats.totalWorkers} workers · ${stats.totalEmployers} employers` : '', Icon: Users, color: 'blue' },
          { label: 'Jobs Posted', value: stats?.totalJobs, sub: stats ? `${stats.openJobs} open · ${stats.activeJobs} active` : '', Icon: Briefcase, color: 'orange' },
          { label: 'Jobs Completed', value: stats?.completedJobs, sub: 'lifetime', Icon: CheckCircle2, color: 'green' },
          { label: 'This Week GMV', value: metrics ? ugx(metrics.gmvUgx) : undefined, sub: 'released payments', Icon: DollarSign, color: 'purple' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${
              kpi.color === 'blue' ? 'bg-blue-100 text-blue-600' :
              kpi.color === 'orange' ? 'bg-orange-100 text-orange-600' :
              kpi.color === 'green' ? 'bg-green-100 text-green-600' :
              'bg-purple-100 text-purple-600'
            }`}>
              <kpi.Icon size={16} />
            </div>
            <p className="text-2xl font-black text-slate-900">
              {kpi.value === undefined ? '—' : kpi.value}
            </p>
            <p className="text-slate-600 font-semibold text-xs mt-0.5">{kpi.label}</p>
            {kpi.sub && <p className="text-slate-400 text-xs mt-1">{kpi.sub}</p>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly funnel — 10 events */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 animate-slide-up-d2">
          <h2 className="font-black text-slate-900">This Week's Funnel</h2>
          <p className="text-slate-400 text-xs mb-4">Week starting {weekLabel} · every count is a live query</p>
          {!funnel ? (
            <div className="empty-state">
              <div className="empty-icon"><BarChart3 size={30} color="#2952E8" /></div>
              <p className="empty-title">{loading ? 'Loading…' : 'No data'}</p>
              <p className="empty-sub">The funnel will appear once activity happens this week.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {FUNNEL_STEPS.map(step => {
                const value = funnel[step.key];
                const pct = Math.max(Math.round((value / maxFunnel) * 100), value > 0 ? 4 : 0);
                const isDispute = step.key === 'dispute_opened';
                return (
                  <div key={step.key} className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isDispute ? 'bg-red-50' : 'bg-blue-50'}`}>
                      <step.Icon size={13} className={isDispute ? 'text-red-500' : 'text-blue-500'} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-slate-700 text-sm font-semibold">{step.label}</span>
                        <span className="text-slate-900 text-sm font-bold">{value}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${isDispute ? 'bg-red-400' : 'bg-blue-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Weekly metrics */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 animate-slide-up-d3">
          <h2 className="font-black text-slate-900 mb-4">Weekly Metrics</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle2 size={22} className="text-green-600" />
              </div>
              <div>
                <p className="font-bold text-[#0A0F2C] text-lg">{metrics ? `${metrics.completionRate}%` : '—'}</p>
                <p className="text-slate-500 text-xs">Completion rate (posted → completed)</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertTriangle size={22} className="text-red-500" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-lg">{metrics ? `${metrics.disputeRate}%` : '—'}</p>
                <p className="text-slate-500 text-xs">Dispute rate (of paid jobs)</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <DollarSign size={22} className="text-purple-600" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-lg">{metrics ? ugx(metrics.commissionRevenueUgx) : '—'}</p>
                <p className="text-slate-500 text-xs">Commission revenue this week</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <ShieldCheck size={22} className="text-blue-600" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-lg">{metrics ? ugx(metrics.guaranteeReserveBalanceUgx) : '—'}</p>
                <p className="text-slate-500 text-xs">Guarantee reserve balance</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
                <Handshake size={22} className="text-teal-600" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-lg">{metrics ? `${metrics.repeatHireRate90d}%` : '—'}</p>
                <p className="text-slate-500 text-xs">
                  90-day repeat-hire rate{metrics ? ` (${metrics.repeatEmployers90d}/${metrics.hiringEmployers90d} employers)` : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <Flag size={22} className="text-amber-600" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-lg">{metrics ? metrics.leakageSignals : '—'}</p>
                <p className="text-slate-500 text-xs">Off-platform signals in chat this week</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
