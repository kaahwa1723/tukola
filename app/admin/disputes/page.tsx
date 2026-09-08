'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Flag, CheckCircle, RefreshCw, AlertTriangle, MessageSquare, Banknote, HandCoins } from 'lucide-react';

interface AdminDispute {
  id: number;
  payment_id: number;
  job_id: string;
  opened_by: string;
  reason: string;
  status: 'open' | 'resolved_release' | 'resolved_refund';
  resolved_by: string | null;
  created_at: string;
  resolved_at: string | null;
  payments?: { amount: number; status: string; payer_id: string; payee_id: string } | null;
  jobs?: { title: string; location: string; pay: number | null } | null;
}

const ugx = (n: number) => `UGX ${n.toLocaleString()}`;

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  open:             { text: 'NEEDS DECISION', cls: 'bg-orange-100 text-orange-600' },
  resolved_release: { text: 'PAID TO FUNDI',  cls: 'bg-green-100 text-green-700' },
  resolved_refund:  { text: 'REFUNDED TO CUSTOMER', cls: 'bg-blue-100 text-blue-700' },
};

const dateFmt = (iso: string) =>
  new Date(iso).toLocaleDateString('en-UG', { month: 'short', day: 'numeric', year: 'numeric' });

/**
 * Admin disputes queue — live data from GET /api/admin/disputes.
 * Resolving posts to /api/admin/disputes/[id]/resolve, which moves the
 * escrowed money (release to fundi, or refund to customer) server-side.
 */
export default function AdminDisputesPage() {
  const router = useRouter();
  const [disputes, setDisputes] = useState<AdminDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [confirmFor, setConfirmFor] = useState<{ id: number; resolution: 'release' | 'refund' } | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/disputes');
      if (res.status === 401) { router.push('/admin/login'); return; }
      if (!res.ok) { setError('Could not load disputes. You may need to sign in again.'); return; }
      const data = await res.json();
      setDisputes(data.disputes ?? []);
    } catch {
      setError('Network error loading disputes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCount = disputes.filter(d => d.status === 'open').length;

  const resolve = async (id: number, resolution: 'release' | 'refund') => {
    if (busyId) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/disputes/${id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || 'Could not resolve the dispute.');
        return;
      }
      setConfirmFor(null);
      await load();
    } catch {
      alert('Network error. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
            <Flag size={20} className="text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#0A0F2C]">Disputes</h1>
            <p className="text-slate-500 text-sm">Jobs where the customer or fundi asked you to decide where the money goes</p>
          </div>
        </div>
        <button onClick={load}
          className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-semibold">
          {error}
        </div>
      )}

      <div className={`rounded-2xl p-4 mb-5 flex items-start gap-3 border ${
        openCount > 0 ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'
      }`}>
        {openCount > 0
          ? <AlertTriangle size={18} className="text-orange-500 flex-shrink-0 mt-0.5" />
          : <CheckCircle size={18} className="text-green-600 flex-shrink-0 mt-0.5" />}
        <p className={`font-semibold text-sm ${openCount > 0 ? 'text-orange-800' : 'text-green-800'}`}>
          {openCount > 0
            ? `${openCount} dispute${openCount === 1 ? '' : 's'} waiting for your decision — the money is frozen until you choose.`
            : 'No open disputes — nothing to action.'}
        </p>
      </div>

      <div className="space-y-3">
        {disputes.map(d => {
          const isOpen = d.status === 'open';
          const st = STATUS_LABEL[d.status] ?? STATUS_LABEL.open;
          return (
            <div key={d.id} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-slate-900">{d.jobs?.title ?? `Job ${d.job_id}`}</h3>
                  <p className="text-slate-500 text-xs mt-0.5">
                    Dispute #{d.id} · {d.jobs?.location ?? 'Location unknown'}
                    {d.payments ? ` · ${ugx(d.payments.amount)} frozen in escrow` : ''}
                  </p>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${st.cls}`}>{st.text}</span>
              </div>

              <div className="flex items-start gap-2.5 bg-slate-50 rounded-xl p-3 mb-4">
                <MessageSquare size={14} className="text-slate-400 flex-shrink-0 mt-0.5" />
                <p className="text-slate-700 text-sm">{d.reason}</p>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-slate-400 text-xs">
                  Opened {dateFmt(d.created_at)}
                  {d.resolved_at ? ` · decided ${dateFmt(d.resolved_at)}` : ''}
                </p>
                {isOpen && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmFor({ id: d.id, resolution: 'release' })}
                      className="text-sm font-semibold text-green-600 bg-green-50 px-3 py-1.5 rounded-xl flex items-center gap-1.5 hover:bg-green-100 transition-colors">
                      <Banknote size={14} /> Pay the fundi
                    </button>
                    <button
                      onClick={() => setConfirmFor({ id: d.id, resolution: 'refund' })}
                      className="text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl flex items-center gap-1.5 hover:bg-blue-100 transition-colors">
                      <HandCoins size={14} /> Refund the customer
                    </button>
                  </div>
                )}
              </div>

              {/* Confirm bar — this moves real money, so it asks twice */}
              {confirmFor?.id === d.id && (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <p className="text-sm font-bold text-slate-900 mb-3">
                    {confirmFor.resolution === 'release'
                      ? `Pay ${d.payments ? ugx(d.payments.amount) : 'the escrowed money'} to the fundi? This cannot be undone.`
                      : `Refund ${d.payments ? ugx(d.payments.amount) : 'the escrowed money'} to the customer? This cannot be undone.`}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => resolve(d.id, confirmFor.resolution)}
                      disabled={busyId === d.id}
                      className="text-white text-sm font-bold px-4 py-2 rounded-xl active:scale-95 transition-transform disabled:opacity-50 flex items-center gap-1.5"
                      style={{ background: 'linear-gradient(135deg,#2952E8,#1A2DB8)' }}>
                      <CheckCircle size={14} /> {busyId === d.id ? 'Working…' : 'Yes, do it'}
                    </button>
                    <button
                      onClick={() => setConfirmFor(null)}
                      className="text-sm font-semibold text-slate-500 bg-slate-50 px-4 py-2 rounded-xl hover:bg-slate-100 transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {!loading && disputes.length === 0 && !error && (
          <div className="empty-state">
            <div className="empty-icon"><CheckCircle size={30} color="#16A34A" /></div>
            <p className="empty-title">No disputes at all</p>
            <p className="empty-sub">When a customer or fundi disputes a payment, it will appear here for you to decide.</p>
          </div>
        )}
      </div>
    </div>
  );
}
