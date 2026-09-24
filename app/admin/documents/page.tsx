'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileBadge, RefreshCw, ShieldCheck, ShieldOff, ExternalLink, CheckCircle } from 'lucide-react';

interface Docs {
  nationalIdNumber: string | null;
  nationalIdPhotoUrl: string | null;
  nextOfKinName: string | null;
  nextOfKinPhone: string | null;
  qualification: string | null;
  certificatePhotoUrl: string | null;
  lcLetterPhotoUrl: string | null;
}

interface QueueEntry {
  userId: string;
  name: string;
  phone: string;
  location: string;
  skills: string[];
  joinedAt: string;
  isVerified: boolean;
  completedJobs: number;
  percent: number;
  missing: string[];
  docs: Docs;
}

const MISSING_LABELS: Record<string, string> = {
  phone: 'Phone', avatar: 'Photo', location: 'Area', about: 'About', skills: 'Skills',
  momo: 'MoMo number', nationalId: 'National ID', nextOfKin: 'Next of kin',
  lcOrCert: 'LC1 letter / certificate', sexDob: 'Sex & DoB', qualification: 'Qualification', portfolio: 'Portfolio',
};

const dateFmt = (iso: string) =>
  new Date(iso).toLocaleDateString('en-UG', { month: 'short', day: 'numeric', year: 'numeric' });

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
 * Admin document review (the vetting work surface).
 * Every fundi who submitted ID / LC1 / certificate documents, with the
 * images inline so review takes seconds. Verification is the existing
 * is_verified toggle — same control as the Users page.
 */
export default function AdminDocumentsPage() {
  const router = useRouter();
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/documents');
      if (res.status === 401) { router.push('/admin/login'); return; }
      if (!res.ok) { setError('Could not load the review queue. You may need to sign in again.'); return; }
      const data = await res.json();
      setQueue(data.queue ?? []);
      setPendingCount(data.pendingVerification ?? 0);
    } catch {
      setError('Network error loading the review queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const setVerified = async (userId: string, value: boolean) => {
    setBusyId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVerified: value }),
      });
      if (!res.ok) throw new Error();
      await load();
    } catch {
      setError('Could not update verification. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between animate-slide-up">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <FileBadge size={20} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#0A0F2C]">Document Review</h1>
            <p className="text-slate-500 text-sm">
              Fundis who submitted ID, LC1 or certificate documents. Review the photos, then verify — or don't.
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

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 mb-8 animate-slide-up-d1">
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <p className="text-xl font-black text-[#0A0F2C]">{pendingCount}</p>
          <p className="text-[#0A0F2C] font-semibold text-sm mt-0.5">Waiting for verification</p>
          <p className="text-slate-400 text-xs mt-0.5">submitted documents, not yet ID-verified</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <p className="text-xl font-black text-[#0A0F2C]">{queue.length}</p>
          <p className="text-[#0A0F2C] font-semibold text-sm mt-0.5">Fundis with documents</p>
          <p className="text-slate-400 text-xs mt-0.5">submitted at least one document or NIN</p>
        </div>
      </div>

      {!loading && queue.length === 0 && !error ? (
        <div className="empty-state">
          <div className="empty-icon"><FileBadge size={30} color="#2952E8" /></div>
          <p className="empty-title">No documents to review</p>
          <p className="empty-sub">When a fundi uploads their national ID, LC1 letter or certificate, it lands here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {queue.map(u => (
            <div key={u.userId} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 animate-slide-up-d2">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="min-w-0">
                  <p className="font-black text-[#0A0F2C] flex items-center gap-2 flex-wrap">
                    {u.name}
                    {u.isVerified && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 flex items-center gap-1">
                        <CheckCircle size={10} /> ID-VERIFIED
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
                    {u.missing.filter(k => ['nationalId', 'nextOfKin', 'lcOrCert'].includes(k)).map(k => (
                      <span key={k} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-500">
                        missing: {MISSING_LABELS[k] ?? k}
                      </span>
                    ))}
                  </div>
                  {(u.docs.nationalIdNumber || u.docs.nextOfKinName || u.docs.qualification) && (
                    <p className="text-slate-500 text-xs mt-2">
                      {u.docs.nationalIdNumber && <>NIN <span className="font-mono font-semibold">{u.docs.nationalIdNumber}</span> · </>}
                      {u.docs.nextOfKinName && <>Next of kin: {u.docs.nextOfKinName} {u.docs.nextOfKinPhone && `(${u.docs.nextOfKinPhone})`} · </>}
                      {u.docs.qualification && <>Qualification: {u.docs.qualification}</>}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setVerified(u.userId, !u.isVerified)}
                  disabled={busyId === u.userId}
                  className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-colors flex-shrink-0 disabled:opacity-60 ${
                    u.isVerified ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'text-white'
                  }`}
                  style={u.isVerified ? {} : { background: 'linear-gradient(135deg,#2952E8,#1A2DB8)' }}
                >
                  {u.isVerified ? <><ShieldOff size={13} /> Remove badge</> : <><ShieldCheck size={13} /> Verify ID</>}
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <DocThumb label="National ID" url={u.docs.nationalIdPhotoUrl} />
                <DocThumb label="LC1 letter" url={u.docs.lcLetterPhotoUrl} />
                <DocThumb label="Certificate" url={u.docs.certificatePhotoUrl} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
