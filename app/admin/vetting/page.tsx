'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck, RefreshCw, ExternalLink, BadgeCheck, Clock, XCircle,
  CheckSquare, Square, FileBadge,
} from 'lucide-react';

interface Docs {
  nationalIdNumber: string | null;
  nationalIdPhotoUrl: string | null;
  nextOfKinName: string | null;
  nextOfKinPhone: string | null;
  qualification: string | null;
  certificatePhotoUrl: string | null;
  lcLetterPhotoUrl: string | null;
}

interface Checks {
  idOk: boolean;
  lcLetterOk: boolean;
  certificateOk: boolean;
  issuerCheckOk: boolean;
  policeClearanceOk: boolean;
}

interface LatestReview {
  status: string;
  checks: Checks;
  notes: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

interface QueueEntry {
  userId: string;
  name: string;
  phone: string;
  location: string;
  skills: string[];
  joinedAt: string;
  isVerified: boolean;
  verifiedPlus: boolean;
  completedJobs: number;
  percent: number;
  docs: Docs;
  latestReview: LatestReview | null;
}

const CHECK_ITEMS: { key: keyof Checks; label: string; hint: string }[] = [
  { key: 'idOk',               label: 'National ID',      hint: 'photo matches profile name & NIN' },
  { key: 'lcLetterOk',         label: 'LC1 letter',       hint: 'area letter confirms residence' },
  { key: 'certificateOk',      label: 'Certificate',      hint: 'DIT / UVTAB / UBTEB document looks genuine' },
  { key: 'issuerCheckOk',      label: 'Issuer check',     hint: 'confirmed with the issuing body' },
  { key: 'policeClearanceOk',  label: 'Police clearance', hint: 'clearance letter seen & valid' },
];

const dateFmt = (iso: string) =>
  new Date(iso).toLocaleDateString('en-UG', { month: 'short', day: 'numeric', year: 'numeric' });

const allChecked = (c: Checks) => Object.values(c).every(Boolean);

function DocThumb({ label, url }: { label: string; url: string | null }) {
  if (!url) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 px-3 py-3 text-center">
        <p className="text-slate-300 text-[10px] font-bold uppercase tracking-wide">{label}</p>
        <p className="text-slate-300 text-[11px] mt-0.5">not submitted</p>
      </div>
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="block rounded-xl overflow-hidden border border-slate-200 hover:border-blue-400 transition-colors group relative">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={label} className="w-full h-24 object-cover" />
      <div className="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1 flex items-center justify-between">
        <span className="text-white text-[10px] font-bold uppercase tracking-wide">{label}</span>
        <ExternalLink size={10} className="text-white/70" />
      </div>
    </a>
  );
}

/**
 * Admin Verified+ vetting queue.
 * Full vetting per fundi: tick each check as it's confirmed, then approve
 * (requires all five), reject (with a reason the fundi receives by SMS),
 * or mark in-review to park it. Approving sets profiles.verified_plus —
 * the ONLY way that badge is earned.
 */
export default function AdminVettingPage() {
  const router = useRouter();
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [plusCount, setPlusCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  // Per-fundi working state: which checks are ticked + notes draft
  const [checks, setChecks] = useState<Record<string, Checks>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/vetting');
      if (res.status === 401) { router.push('/admin/login'); return; }
      if (!res.ok) { setError('Could not load the vetting queue. You may need to sign in again.'); return; }
      const data = await res.json();
      const q: QueueEntry[] = data.queue ?? [];
      setQueue(q);
      setPendingCount(data.pendingReview ?? 0);
      setPlusCount(data.verifiedPlusCount ?? 0);
      // Pre-fill working state from each fundi's latest review
      const nextChecks: Record<string, Checks> = {};
      const nextNotes: Record<string, string> = {};
      for (const u of q) {
        nextChecks[u.userId] = u.latestReview?.checks ?? {
          idOk: false, lcLetterOk: false, certificateOk: false, issuerCheckOk: false, policeClearanceOk: false,
        };
        nextNotes[u.userId] = u.latestReview?.notes ?? '';
      }
      setChecks(nextChecks);
      setNotes(nextNotes);
    } catch {
      setError('Network error loading the vetting queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleCheck = (userId: string, key: keyof Checks) => {
    setChecks(prev => ({
      ...prev,
      [userId]: { ...prev[userId], [key]: !prev[userId]?.[key] },
    }));
  };

  const submit = async (userId: string, decision: 'in_review' | 'approve' | 'reject') => {
    setBusyId(userId);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch('/api/admin/vetting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fundiId: userId, checks: checks[userId], decision, notes: notes[userId] }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'Could not save the review. Please try again.');
        return;
      }
      setNotice(
        decision === 'approve' ? 'Verified+ granted — the fundi has been notified by SMS.'
        : decision === 'reject' ? 'Review rejected — the fundi has been notified by SMS.'
        : 'Marked as in review.'
      );
      await load();
    } catch {
      setError('Network error saving the review.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between animate-slide-up">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
            <BadgeCheck size={20} className="text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#0A0F2C]">Verified+ Vetting</h1>
            <p className="text-slate-500 text-sm">
              Full vetting: ID + LC1 + certificate + issuer check + police clearance. All five must pass.
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
      {notice && (
        <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm font-semibold">
          {notice}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 mb-8 animate-slide-up-d1">
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <p className="text-xl font-black text-[#0A0F2C]">{pendingCount}</p>
          <p className="text-[#0A0F2C] font-semibold text-sm mt-0.5">Awaiting vetting</p>
          <p className="text-slate-400 text-xs mt-0.5">submitted documents, not yet Verified+</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <p className="text-xl font-black text-emerald-600">{plusCount}</p>
          <p className="text-[#0A0F2C] font-semibold text-sm mt-0.5">Verified+ fundis</p>
          <p className="text-slate-400 text-xs mt-0.5">passed all five checks</p>
        </div>
      </div>

      {!loading && queue.length === 0 && !error ? (
        <div className="empty-state">
          <div className="empty-icon"><FileBadge size={30} color="#2952E8" /></div>
          <p className="empty-title">Nobody waiting for vetting</p>
          <p className="empty-sub">When a fundi uploads their national ID, LC1 letter or certificate, they appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {queue.map(u => {
            const c = checks[u.userId] ?? {
              idOk: false, lcLetterOk: false, certificateOk: false, issuerCheckOk: false, policeClearanceOk: false,
            };
            const ready = allChecked(c);
            const busy = busyId === u.userId;
            return (
              <div key={u.userId} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 animate-slide-up-d2">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="min-w-0">
                    <p className="font-black text-[#0A0F2C] flex items-center gap-2 flex-wrap">
                      {u.name}
                      {u.verifiedPlus && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-1">
                          <BadgeCheck size={10} /> VERIFIED+
                        </span>
                      )}
                      {u.isVerified && !u.verifiedPlus && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 flex items-center gap-1">
                          <ShieldCheck size={10} /> ID-VERIFIED
                        </span>
                      )}
                      {u.latestReview?.status === 'in_review' && !u.verifiedPlus && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 flex items-center gap-1">
                          <Clock size={10} /> IN REVIEW
                        </span>
                      )}
                      {u.latestReview?.status === 'rejected' && !u.verifiedPlus && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600 flex items-center gap-1">
                          <XCircle size={10} /> REJECTED
                        </span>
                      )}
                    </p>
                    <p className="text-slate-400 text-xs mt-0.5">
                      {u.phone} · {u.location || 'no area'} · {u.skills.slice(0, 3).join(', ') || 'no skills'} · joined {dateFmt(u.joinedAt)} · {u.completedJobs} jobs
                    </p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${u.percent >= 80 ? 'bg-green-100 text-green-700' : u.percent >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                        Profile {u.percent}%
                      </span>
                    </div>
                    {(u.docs.nationalIdNumber || u.docs.nextOfKinName || u.docs.qualification) && (
                      <p className="text-slate-500 text-xs mt-2">
                        {u.docs.nationalIdNumber && <>NIN <span className="font-mono font-semibold">{u.docs.nationalIdNumber}</span> · </>}
                        {u.docs.nextOfKinName && <>Next of kin: {u.docs.nextOfKinName} {u.docs.nextOfKinPhone && `(${u.docs.nextOfKinPhone})`} · </>}
                        {u.docs.qualification && <>Qualification: {u.docs.qualification}</>}
                      </p>
                    )}
                    {u.latestReview && (
                      <p className="text-slate-400 text-[11px] mt-1.5">
                        Last review: <span className="font-semibold">{u.latestReview.status.replace('_', ' ')}</span>
                        {u.latestReview.reviewedAt ? ` · ${dateFmt(u.latestReview.reviewedAt)}` : ''}
                        {u.latestReview.notes ? ` · “${u.latestReview.notes}”` : ''}
                      </p>
                    )}
                  </div>
                </div>

                {/* Documents */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <DocThumb label="National ID" url={u.docs.nationalIdPhotoUrl} />
                  <DocThumb label="LC1 letter" url={u.docs.lcLetterPhotoUrl} />
                  <DocThumb label="Certificate" url={u.docs.certificatePhotoUrl} />
                </div>

                {/* Checklist */}
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 mb-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                    {CHECK_ITEMS.map(({ key, label, hint }) => (
                      <button
                        key={key}
                        onClick={() => toggleCheck(u.userId, key)}
                        disabled={busy}
                        className={`flex items-start gap-2 text-left rounded-lg px-2.5 py-2 transition-colors border ${
                          c[key]
                            ? 'bg-emerald-50 border-emerald-200'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {c[key]
                          ? <CheckSquare size={15} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                          : <Square size={15} className="text-slate-300 flex-shrink-0 mt-0.5" />}
                        <span>
                          <span className={`block text-[11px] font-bold ${c[key] ? 'text-emerald-700' : 'text-slate-600'}`}>{label}</span>
                          <span className="block text-[10px] text-slate-400 leading-snug">{hint}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={notes[u.userId] ?? ''}
                    onChange={e => setNotes(prev => ({ ...prev, [u.userId]: e.target.value }))}
                    placeholder="Notes — on rejection this goes to the fundi by SMS (max 500 chars)"
                    maxLength={500}
                    disabled={busy}
                    className="mt-2 w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-400 focus:outline-none disabled:opacity-60"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => submit(u.userId, 'approve')}
                    disabled={busy || !ready}
                    title={ready ? 'Grant the Verified+ badge' : 'All five checks must be ticked first'}
                    className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl text-white transition-opacity disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg,#059669,#047857)' }}
                  >
                    <BadgeCheck size={13} /> Approve Verified+
                  </button>
                  <button
                    onClick={() => submit(u.userId, 'in_review')}
                    disabled={busy}
                    className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-60"
                  >
                    <Clock size={13} /> Mark in review
                  </button>
                  <button
                    onClick={() => submit(u.userId, 'reject')}
                    disabled={busy}
                    className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-60"
                  >
                    <XCircle size={13} /> Reject
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
