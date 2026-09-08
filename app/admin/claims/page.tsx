'use client';

import { useEffect, useState } from 'react';
import { ShieldCheck, CheckCircle, XCircle, RefreshCw, RotateCcw, Banknote, MessageSquare } from 'lucide-react';

type ClaimStatus = 'submitted' | 'under_review' | 'approved_redo' | 'approved_refund' | 'rejected';

interface AdminClaim {
  id: number;
  claimant_id: string;
  job_id: string;
  payment_id: number;
  reason: string;
  photo_urls: string[];
  status: ClaimStatus;
  amount_claimed: number | null;
  amount_approved: number | null;
  reviewed_by: string | null;
  resolution_note: string | null;
  created_at: string;
  reviewed_at: string | null;
  jobs?: { title: string; location: string; pay: number | null } | null;
  payments?: { amount: number; status: string; released_at: string | null } | null;
}

const ugx = (n: number) => `UGX ${n.toLocaleString()}`;

const STATUS_COLOR: Record<string, string> = {
  submitted: 'bg-blue-100 text-blue-700',
  under_review: 'bg-orange-100 text-orange-600',
  approved_redo: 'bg-green-100 text-green-700',
  approved_refund: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
};

/**
 * Admin guarantee-claims queue (Phase 2).
 * Live data from GET /api/admin/claims — open claims first. Resolutions
 * POST to /api/admin/claims/[id]/resolve; refunds are capped server-side
 * at min(claim, UGX 200,000, reserve balance) and paid as append-only
 * rows from the guarantee_reserve ledger.
 */
export default function AdminClaimsPage() {
  const [claims, setClaims] = useState<AdminClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionFor, setActionFor] = useState<number | null>(null);
  const [action, setAction] = useState<'approve_redo' | 'approve_refund' | 'reject'>('approve_refund');
  const [note, setNote] = useState('');
  const [amount, setAmount] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/claims');
      if (!res.ok) {
        setError('Could not load claims. You may need to sign in again.');
        return;
      }
      const data = await res.json();
      setClaims(data.claims ?? []);
    } catch {
      setError('Network error loading claims.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openClaims = claims.filter(c => c.status === 'submitted' || c.status === 'under_review');

  const startAction = (claimId: number, a: typeof action) => {
    setActionFor(claimId);
    setAction(a);
    setNote('');
    setAmount('');
  };

  const submitResolution = async (claimId: number) => {
    if (busyId) return;
    setBusyId(claimId);
    try {
      const res = await fetch(`/api/admin/claims/${claimId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resolution: action,
          note: note.trim() || undefined,
          amount: action === 'approve_refund' && amount ? Number(amount) : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || 'Could not resolve the claim.');
        return;
      }
      setActionFor(null);
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
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <ShieldCheck size={20} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#0A0F2C]">Guarantee Claims</h1>
            <p className="text-slate-500 text-sm">Re-dos and refunds (up to UGX 200,000 each) paid from the guarantee pot</p>
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

      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-5">
        <p className="font-semibold text-blue-900 text-sm">
          {openClaims.length} open claim{openClaims.length === 1 ? '' : 's'} awaiting review
        </p>
      </div>

      <div className="space-y-3">
        {claims.map(claim => {
          const isOpen = claim.status === 'submitted' || claim.status === 'under_review';
          return (
            <div key={claim.id} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-slate-900">{claim.jobs?.title ?? `Job ${claim.job_id}`}</h3>
                  <p className="text-slate-500 text-xs mt-0.5">
                    Claim #{claim.id} · Job paid {claim.payments ? ugx(claim.payments.amount) : '—'}
                    {claim.amount_claimed ? ` · claimed ${ugx(claim.amount_claimed)}` : ''}
                  </p>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_COLOR[claim.status]}`}>
                  {claim.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>

              <div className="flex items-start gap-2.5 bg-slate-50 rounded-xl p-3 mb-4">
                <MessageSquare size={14} className="text-slate-400 flex-shrink-0 mt-0.5" />
                <p className="text-slate-700 text-sm">{claim.reason}</p>
              </div>

              {claim.resolution_note && (
                <p className="text-slate-500 text-xs italic mb-3">Resolution note: {claim.resolution_note}</p>
              )}
              {claim.amount_approved != null && claim.amount_approved > 0 && (
                <p className="text-green-700 text-xs font-bold mb-3">
                  Approved: {ugx(claim.amount_approved)} (paid from the guarantee pot)
                </p>
              )}

              <div className="flex items-center justify-between">
                <p className="text-slate-400 text-xs">
                  {new Date(claim.created_at).toLocaleDateString('en-UG', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
                {isOpen && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => startAction(claim.id, 'approve_redo')}
                      className="text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl flex items-center gap-1.5 hover:bg-blue-100 transition-colors">
                      <RotateCcw size={14} /> Re-do
                    </button>
                    <button
                      onClick={() => startAction(claim.id, 'approve_refund')}
                      className="text-sm font-semibold text-green-600 bg-green-50 px-3 py-1.5 rounded-xl flex items-center gap-1.5 hover:bg-green-100 transition-colors">
                      <Banknote size={14} /> Refund
                    </button>
                    <button
                      onClick={() => startAction(claim.id, 'reject')}
                      className="text-sm font-semibold text-red-500 bg-red-50 px-3 py-1.5 rounded-xl flex items-center gap-1.5 hover:bg-red-100 transition-colors">
                      <XCircle size={14} /> Reject
                    </button>
                  </div>
                )}
              </div>

              {/* Inline resolution form */}
              {actionFor === claim.id && (
                <div className="mt-4 border-t border-slate-100 pt-4 space-y-2.5">
                  <p className="text-sm font-bold text-slate-900">
                    {action === 'approve_redo' && 'Approve as re-do (no reserve payout)'}
                    {action === 'approve_refund' && 'Approve refund from the guarantee pot'}
                    {action === 'reject' && 'Reject this claim'}
                  </p>
                  {action === 'approve_refund' && (
                    <div>
                      <input
                        type="number"
                        min={1}
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        placeholder={`Amount in UGX (blank = claimed amount, capped at UGX 200,000 and what's in the guarantee pot)`}
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                      />
                    </div>
                  )}
                  <textarea
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    rows={2}
                    placeholder={action === 'reject' ? 'Reason for rejection (required)' : 'Resolution note (optional)'}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => submitResolution(claim.id)}
                      disabled={busyId === claim.id || (action === 'reject' && !note.trim())}
                      className="text-white text-sm font-bold px-4 py-2 rounded-xl active:scale-95 transition-transform disabled:opacity-50 flex items-center gap-1.5"
                      style={{ background: 'linear-gradient(135deg,#2952E8,#1A2DB8)' }}>
                      <CheckCircle size={14} /> {busyId === claim.id ? 'Saving…' : 'Confirm'}
                    </button>
                    <button
                      onClick={() => setActionFor(null)}
                      className="text-sm font-semibold text-slate-500 bg-slate-50 px-4 py-2 rounded-xl hover:bg-slate-100 transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {!loading && claims.length === 0 && !error && (
          <div className="empty-state">
            <div className="empty-icon"><ShieldCheck size={30} color="#2952E8" /></div>
            <p className="empty-title">No claims yet</p>
            <p className="empty-sub">Guarantee claims filed by customers will appear here for review.</p>
          </div>
        )}
      </div>
    </div>
  );
}
