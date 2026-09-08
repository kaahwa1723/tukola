'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Phone, RefreshCw, AlertTriangle, CheckCircle2, CalendarDays } from 'lucide-react';

interface LeakageEvent {
  id: number;
  fromName: string;
  jobTitle?: string;
  signals: string[];
  hadCapturedPayment: boolean;
  createdAt: string;
}

interface Summary {
  totalAllTime: number;
  thisWeek: number;
  withoutPaymentProtected: number;
}

/** Turn a raw signal like 'phone_number' or 'keyword:momo' into plain English. */
function signalLabel(signal: string): string {
  if (signal === 'phone_number') return 'Shared a phone number';
  if (signal.startsWith('keyword:')) return `Mentioned "${signal.slice('keyword:'.length)}"`;
  return signal;
}

const dateFmt = (iso: string) =>
  new Date(iso).toLocaleDateString('en-UG', { month: 'short', day: 'numeric', year: 'numeric' });

/**
 * Admin leakage overview (read-only).
 * Honest framing: these chats mentioned phone/payment keywords — possible
 * off-platform dealing. We never see or store the message text, only
 * which signal matched. Nothing here is an estimate.
 */
export default function AdminLeakagePage() {
  const router = useRouter();
  const [events, setEvents] = useState<LeakageEvent[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/leakage');
      if (res.status === 401) { router.push('/admin/login'); return; }
      if (!res.ok) { setError('Could not load leakage signals. You may need to sign in again.'); return; }
      const data = await res.json();
      setEvents(data.events ?? []);
      setSummary(data.summary ?? null);
    } catch {
      setError('Network error loading leakage signals.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const cards = [
    {
      label: 'Signals this week', value: summary ? summary.thisWeek : '—',
      sub: 'chats with phone/payment keywords since Monday',
      Icon: CalendarDays, color: '#2952E8', bg: '#EEF2FF',
    },
    {
      label: 'Signals all time', value: summary ? summary.totalAllTime : '—',
      sub: 'every off-platform signal ever recorded',
      Icon: Phone, color: '#D97706', bg: '#FFF7ED',
    },
    {
      label: 'Money not protected', value: summary ? summary.withoutPaymentProtected : '—',
      sub: 'signals in chats where no payment was held in escrow yet — the risky ones',
      Icon: AlertTriangle, color: '#DC2626', bg: '#FEF2F2',
    },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6 flex items-center justify-between animate-slide-up">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
            <ShieldAlert size={20} className="text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#0A0F2C]">Leakage Signals</h1>
            <p className="text-slate-500 text-sm">Possible off-platform dealing spotted in chat. Read-only.</p>
          </div>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-xl transition-colors disabled:opacity-60"
          style={{ background: '#EEF2FF', color: '#2952E8' }}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Honest framing */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5 flex items-start gap-3">
        <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-amber-800 text-sm">
            These chats mentioned phone numbers or payment keywords — a sign the deal may be moving off-platform.
          </p>
          <p className="text-amber-700 text-xs mt-1">
            Messages are never blocked and we never store the message text — only which keyword matched.
            A match is a hint, not proof: people share numbers for innocent reasons too.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-semibold">
          {error}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 animate-slide-up-d1">
        {cards.map(c => (
          <div key={c.label} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3" style={{ background: c.bg }}>
              <c.Icon size={18} color={c.color} />
            </div>
            <p className="text-2xl font-black text-[#0A0F2C]">{c.value}</p>
            <p className="text-[#0A0F2C] font-semibold text-sm mt-0.5">{c.label}</p>
            <p className="text-slate-400 text-xs mt-0.5">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Event list */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 animate-slide-up-d2">
        <h2 className="font-black text-[#0A0F2C] mb-1">Recent signals</h2>
        <p className="text-slate-400 text-xs mb-4">Newest first · who sent it, what matched, and when</p>

        {!loading && events.length === 0 && !error ? (
          <div className="empty-state">
            <div className="empty-icon"><CheckCircle2 size={30} color="#16A34A" /></div>
            <p className="empty-title">No leakage signals yet</p>
            <p className="empty-sub">No chat has mentioned phone or payment keywords — nothing to action.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {events.map(e => (
              <div key={e.id} className="py-3 flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  e.hadCapturedPayment ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  <Phone size={15} className={e.hadCapturedPayment ? 'text-green-600' : 'text-red-500'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#0A0F2C] text-sm">{e.fromName}</p>
                  <p className="text-slate-500 text-xs mt-0.5">
                    {e.signals.map(signalLabel).join(' · ')}
                    {e.jobTitle ? ` · on job "${e.jobTitle}"` : ''}
                  </p>
                  <p className="text-slate-400 text-xs mt-0.5">
                    {dateFmt(e.createdAt)}
                    {' · '}
                    {e.hadCapturedPayment
                      ? 'payment already held in escrow — lower risk'
                      : 'no payment held yet — higher risk'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
