'use client';

import { useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  MapPin, Calendar, Banknote, Phone, Users, Lock, ChevronLeft, CheckCircle,
  Images, Star, Briefcase, ShieldCheck, Wrench, Sparkles, Zap, Car, ChefHat,
  Leaf, Shield, Paintbrush, Package, Scissors, Truck, Hammer, Building2, Search,
  MessageCircle, RotateCcw, Pencil
} from 'lucide-react';
import { useKola } from '@/lib/store';
import { useI18n } from '@/lib/i18n';
import GuaranteeClaimBlock from '@/app/components/GuaranteeClaim';
import { computeProfileCompletion } from '@/lib/profile-completion';

const ICON_MAP: Record<string, React.ElementType> = {
  Plumbing: Wrench, Electrical: Zap, Cleaning: Sparkles, Construction: Building2,
  Driving: Car, Cooking: ChefHat, Gardening: Leaf, Security: Shield,
  Painting: Paintbrush, Moving: Package, Tailoring: Scissors, Logistics: Truck,
};

function getJobIcon(title: string) {
  const lower = title.toLowerCase();
  if (lower.includes('plumb') || lower.includes('pipe')) return Wrench;
  if (lower.includes('electr')) return Zap;
  if (lower.includes('clean')) return Sparkles;
  if (lower.includes('build') || lower.includes('construct')) return Hammer;
  if (lower.includes('driv') || lower.includes('deliver')) return Car;
  if (lower.includes('cook') || lower.includes('chef')) return ChefHat;
  if (lower.includes('garden') || lower.includes('lawn')) return Leaf;
  if (lower.includes('secur') || lower.includes('guard')) return Shield;
  if (lower.includes('paint')) return Paintbrush;
  if (lower.includes('mov') || lower.includes('pack')) return Package;
  if (lower.includes('tailor')) return Scissors;
  if (lower.includes('truck') || lower.includes('logistic')) return Truck;
  return Briefcase;
}

export default function JobDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { jobs, user, applyToJob, applications, acceptApplicant, refreshJobs } = useKola();
  const { t } = useI18n();
  const router = useRouter();
  const [rebooking, setRebooking] = useState(false);
  const [recurringMsg, setRecurringMsg] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSaved, setEditSaved] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '', description: '', location: '', dateTime: '', pay: '', workersNeeded: 1, urgency: 'scheduled' as 'immediate' | 'scheduled',
  });
  // Double-click guard for startConversation — a hook, so it MUST stay above
  // the `if (!job) return` early return below (rules of hooks).
  const startingConv = useRef(false);

  const job = jobs.find(j => j.id === id);

  if (!job) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F0F4FF]">
        <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center mb-3 shadow-sm">
          <Search size={28} color="#2952E8" />
        </div>
        <h2 className="text-slate-900 font-bold">{t('job.notFound')}</h2>
        <button onClick={() => router.back()} className="mt-4 text-blue-600 font-semibold">{t('job.goBack')}</button>
      </div>
    );
  }

  const isWorker = user?.role === 'worker';
  const isEmployer = user?.role === 'employer';
  const hasApplied = applications.includes(job.id);
  const isMyJob = isEmployer && job.employerId === user?.id;
  // Re-book invitation for THIS worker (server includes only their own row)
  const myApplication = isWorker ? job.applicants.find(a => a.workerId === user?.id) : undefined;
  const isInvited = myApplication?.status === 'invited';

  const JobIcon = getJobIcon(job.title);

  const handleApply = () => {
    // Trust-layer gate mirrors the server: incomplete-profile fundis go to
    // their profile instead of getting an optimistic "applied" that the
    // server then rejects (no fake states).
    if (isWorker && !computeProfileCompletion(user).canWork) {
      router.push('/worker/profile');
      return;
    }
    applyToJob(job.id);
  };
  const handleAccept = (applicantId: string) => acceptApplicant(job.id, applicantId);

  // Employer editing — allowed only while the job is still open (server
  // enforces this too). Fields are pre-filled from the live job.
  const startEditing = () => {
    let dt = '';
    try {
      const d = new Date(job.dateTime);
      if (!isNaN(d.getTime())) dt = d.toISOString().slice(0, 16);
    } catch {}
    setEditForm({
      title: job.title,
      description: job.description ?? '',
      location: job.location,
      dateTime: dt,
      pay: job.pay ? String(job.pay) : '',
      workersNeeded: job.workersNeeded,
      urgency: job.urgency,
    });
    setEditError('');
    setEditSaved(false);
    setEditing(true);
  };

  const saveEdit = async () => {
    if (editBusy) return;
    setEditBusy(true);
    setEditError('');
    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editForm.title.trim(),
          description: editForm.description.trim(),
          location: editForm.location.trim(),
          dateTime: editForm.dateTime ? new Date(editForm.dateTime).toISOString() : undefined,
          pay: editForm.pay ? Number(editForm.pay) : undefined,
          workersNeeded: Number(editForm.workersNeeded) || 1,
          urgency: editForm.urgency,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEditError(data.error || t('common.networkError'));
      } else {
        setEditing(false);
        setEditSaved(true);
        setTimeout(() => setEditSaved(false), 3000);
        refreshJobs();
      }
    } catch {
      setEditError(t('common.networkError'));
    } finally {
      setEditBusy(false);
    }
  };

  // "Book the same fundi again" — one tap clones the completed job and
  // invites the same worker back; they accept with one tap on their side.
  const handleRebook = async () => {
    if (rebooking) return;
    setRebooking(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/rebook`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.job?.id) {
        router.push(`/job/${data.job.id}`);
      } else {
        alert(data.error || t('job.rebookError'));
      }
    } catch {
      alert(t('common.networkError'));
    } finally {
      setRebooking(false);
    }
  };

  // "Make it recurring" — the same fundi is auto-invited every week /
  // every 2 weeks. Payment stays per-instance (MoMo needs a PIN each time).
  const handleRecurring = async (frequency: 'weekly' | 'biweekly') => {
    setRecurringMsg(null);
    try {
      const dayOfWeek = new Date(job.dateTime || Date.now()).getDay();
      const res = await fetch('/api/recurring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: job.id, frequency, dayOfWeek }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setRecurringMsg(
          frequency === 'weekly'
            ? t('job.recurringWeekly')
            : t('job.recurringBiweekly')
        );
      } else {
        setRecurringMsg(data.error || t('job.recurringError'));
      }
    } catch {
      setRecurringMsg(t('common.networkError'));
    }
  };

  // Start (or reopen) a conversation with the counterparty, then go to messages.
  // Guarded against double-clicks — two parallel POSTs could both miss the
  // existing-conversation check and insert duplicates.
  const startConversation = async (otherUserId: string, otherUserName: string) => {
    if (!user || startingConv.current) return;
    startingConv.current = true;
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: job.id,
          jobTitle: job.title,
          user2Id: otherUserId,
        }),
      });
    } catch (e) {
      console.warn('[start conversation]', e);
    }
    router.push(isEmployer ? '/employer/messages' : '/worker/messages');
  };

  return (
    <div className="min-h-screen bg-[#F0F4FF]">
      <div className="max-w-3xl mx-auto px-4 lg:px-6 py-4 lg:py-8 pb-32 lg:pb-12">

        {/* Back button */}
        <button onClick={() => router.back()}
          className="flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-4">
          <ChevronLeft size={18} /> {t('common.back')}
        </button>

        {/* Edit form (employer, open jobs only) */}
        {editing && isMyJob && (
          <div className="bg-white rounded-3xl border border-blue-100/40 p-5 lg:p-6 mb-5 space-y-3">
            <h3 className="font-bold text-[#0A0F2C]">{t('pj.edit')}</h3>
            <p className="text-slate-400 text-[11px]">{t('pj.editNote')}</p>
            <input
              value={editForm.title}
              onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
              placeholder={t('pj.titlePlaceholder')}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
            <textarea
              value={editForm.description}
              onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
              placeholder={t('pj.descPlaceholder')}
              rows={3}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 resize-none"
            />
            <input
              value={editForm.location}
              onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))}
              placeholder={t('pj.locationPlaceholder')}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="datetime-local"
                value={editForm.dateTime}
                onChange={e => setEditForm(f => ({ ...f, dateTime: e.target.value }))}
                className="border border-slate-200 rounded-xl px-3 py-3 text-sm text-slate-900 focus:outline-none focus:border-blue-500"
              />
              <input
                type="tel" inputMode="numeric"
                value={editForm.pay}
                onChange={e => setEditForm(f => ({ ...f, pay: e.target.value.replace(/[^\d]/g, '') }))}
                placeholder={t('pj.payPlaceholder')}
                className="border border-slate-200 rounded-xl px-3 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={editForm.workersNeeded}
                onChange={e => setEditForm(f => ({ ...f, workersNeeded: Number(e.target.value) }))}
                className="border border-slate-200 rounded-xl px-3 py-3 text-sm text-slate-900 focus:outline-none focus:border-blue-500 bg-white"
              >
                {[1,2,3,4,5,6,7,8,9,10].map(n => (
                  <option key={n} value={n}>{t('job.workersNeeded', { n })}</option>
                ))}
              </select>
              <select
                value={editForm.urgency}
                onChange={e => setEditForm(f => ({ ...f, urgency: e.target.value as 'immediate' | 'scheduled' }))}
                className="border border-slate-200 rounded-xl px-3 py-3 text-sm text-slate-900 focus:outline-none focus:border-blue-500 bg-white"
              >
                <option value="scheduled">{t('job.scheduled')}</option>
                <option value="immediate">{t('job.urgent')}</option>
              </select>
            </div>
            {editError && <p className="text-red-500 text-xs font-medium">{editError}</p>}
            <div className="flex gap-2">
              <button
                onClick={saveEdit}
                disabled={editBusy || !editForm.title.trim() || !editForm.location.trim()}
                className="flex-1 py-3.5 rounded-2xl font-bold text-white text-sm active:scale-95 transition-transform disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#2952E8,#1A2DB8)' }}
              >
                {editBusy ? '…' : t('pj.saveEdit')}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="px-5 py-3.5 rounded-2xl font-bold text-sm text-slate-500 bg-slate-100 active:scale-95 transition-transform"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}

        {/* Job hero card */}
        <div className="bg-white rounded-3xl border border-blue-100/40 overflow-hidden mb-5">
          {/* Top accent bar */}
          <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, #00C8FF, #2952E8, #1A2DB8)' }} />

          <div className="p-5 lg:p-6">
            {/* Header */}
            <div className="flex items-start gap-4 mb-5">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: '#EEF2FF' }}>
                <JobIcon size={26} color="#2952E8" strokeWidth={1.8} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h1 className="text-xl lg:text-2xl font-black text-[#0A0F2C] leading-tight">{job.title}</h1>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 tracking-wide uppercase ${
                    job.urgency === 'immediate'
                      ? 'bg-orange-100 text-orange-600'
                      : 'bg-blue-100 text-blue-600'
                  }`}>
                    {job.urgency === 'immediate' ? t('job.urgent') : t('job.scheduled')}
                  </span>
                </div>
                <p className="text-slate-500 text-sm mt-1">{t('job.postedBy', { name: job.employerName })}</p>
                {isMyJob && job.status === 'open' && !editing && (
                  <button onClick={startEditing}
                    className="mt-2 flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 active:scale-95 transition-transform">
                    <Pencil size={12} /> {t('pj.edit')}
                  </button>
                )}
                {editSaved && (
                  <p className="mt-2 flex items-center gap-1 text-xs font-bold text-green-600">
                    <CheckCircle size={12} /> {t('pj.editSaved')}
                  </p>
                )}
              </div>
            </div>

            {/* Key details grid */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              {job.pay && (
                <div className="rounded-2xl p-3.5" style={{ background: '#F0F4FF' }}>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-blue-600 mb-1">{t('job.pay')}</p>
                  <p className="text-lg font-black text-[#0A0F2C]">UGX {job.pay.toLocaleString()}</p>
                </div>
              )}
              <div className="rounded-2xl p-3.5" style={{ background: '#F0F4FF' }}>
                <p className="text-[10px] font-bold uppercase tracking-wide text-blue-600 mb-1">{t('job.workers')}</p>
                <p className="text-lg font-black text-[#0A0F2C]">{t('job.workersNeeded', { n: job.workersNeeded })}</p>
              </div>
              <div className="rounded-2xl p-3.5 col-span-2 lg:col-span-1" style={{ background: '#F0F4FF' }}>
                <p className="text-[10px] font-bold uppercase tracking-wide text-blue-600 mb-1">{t('job.when')}</p>
                <p className="text-sm font-semibold text-[#0A0F2C]">
                  {new Date(job.dateTime).toLocaleString('en-UG', {
                    weekday: 'long', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                </p>
              </div>
              <div className="rounded-2xl p-3.5 col-span-2 lg:col-span-1" style={{ background: '#F0F4FF' }}>
                <p className="text-[10px] font-bold uppercase tracking-wide text-blue-600 mb-1">{t('job.where')}</p>
                <p className="text-sm font-semibold text-[#0A0F2C] flex items-center gap-1">
                  <MapPin size={12} /> {job.location}
                  {job.distanceKm && <span className="text-slate-400">• {job.distanceKm}km</span>}
                </p>
              </div>
            </div>

            {/* Job images */}
            {job.images && job.images.length > 0 && (
              <div className="mb-5">
                <h3 className="text-sm font-bold text-[#0A0F2C] mb-2 flex items-center gap-1.5">
                  <Images size={14} color="#2952E8" /> {t('job.photos')}
                </h3>
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                  {job.images.map((src, i) => (
                    <div key={i} className="flex-shrink-0 w-28 h-28 lg:w-36 lg:h-36 rounded-xl overflow-hidden"
                      style={{ border: '1px solid rgba(41,82,232,0.1)' }}>
                      <img src={src} alt={`${t('job.photos')} ${i + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {job.description && (
              <div className="mb-5">
                <h3 className="text-sm font-bold text-[#0A0F2C] mb-2">{t('job.description')}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{job.description}</p>
              </div>
            )}

            {/* Skills */}
            {job.skills && job.skills.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-[#0A0F2C] mb-2">{t('job.skillsNeeded')}</h3>
                <div className="flex flex-wrap gap-2">
                  {job.skills.map(skill => (
                    <span key={skill} className="bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Employer contact (workers only) */}
        {isWorker && (
          <div className="bg-white rounded-3xl p-5 border border-blue-100/40 mb-5">
            <h3 className="font-bold text-[#0A0F2C] mb-3">{t('job.employer')}</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg,#2952E8,#1A2DB8)' }}>
                  <span className="text-white font-bold text-lg">{job.employerName.charAt(0)}</span>
                </div>
                <div>
                  <p className="font-bold text-[#0A0F2C] text-sm">{job.employerName}</p>
                  {!job.employerPhone && (
                    <p className="text-slate-400 text-xs flex items-center gap-1">
                      <Lock size={10} /> {t('job.phoneLocked')}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => startConversation(job.employerId, job.employerName)}
                  aria-label={t('job.msgEmployer')}
                  className="w-11 h-11 bg-blue-50 rounded-2xl flex items-center justify-center active:scale-95 transition-transform hover:bg-blue-100">
                  <MessageCircle size={18} className="text-blue-600" />
                </button>
                {job.employerPhone && (
                  <a href={`tel:${job.employerPhone}`}
                    aria-label={t('job.callEmployer')}
                    className="w-11 h-11 bg-green-50 rounded-2xl flex items-center justify-center active:scale-95 transition-transform hover:bg-green-100">
                    <Phone size={18} className="text-green-600" />
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Applicants (employer view) */}
        {isMyJob && job.applicants.length > 0 && (
          <div className="bg-white rounded-3xl p-5 border border-blue-100/40 mb-5">
            <h3 className="font-bold text-[#0A0F2C] mb-3">{t('job.applicants', { n: job.applicants.length })}</h3>
            <div className="space-y-4">
              {job.applicants.map(applicant => {
                return (
                  <div key={applicant.workerId} className="py-3 border-b border-slate-50 last:border-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
                          style={{ background: 'linear-gradient(135deg,#2952E8,#1A2DB8)' }}>
                          <span className="text-white font-bold text-sm">{applicant.workerName.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="font-bold text-[#0A0F2C] text-sm">{applicant.workerName}</p>
                          <div className="flex items-center gap-2">
                            {applicant.rating != null && applicant.rating > 0 ? (
                              <span className="flex items-center gap-0.5 text-xs text-yellow-600">
                                <Star size={11} className="fill-yellow-500 text-yellow-500" /> {applicant.rating.toFixed(1)}
                              </span>
                            ) : (
                              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">New</span>
                            )}
                            <span className="text-xs text-slate-400">{t('job.jobsCount', { n: applicant.completedJobs ?? 0 })}</span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {applicant.skills?.slice(0, 2).map(s => (
                              <span key={s} className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                                style={{ background: '#EEF2FF', color: '#2952E8' }}>{s}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => startConversation(applicant.workerId, applicant.workerName)}
                          aria-label={`${t('wj.message')} ${applicant.workerName}`}
                          className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center active:scale-95 transition-transform hover:bg-blue-100">
                          <MessageCircle size={15} className="text-blue-600" />
                        </button>
                        {applicant.status === 'accepted' ? (
                          <span className="flex items-center gap-1 text-green-600 text-xs font-bold bg-green-50 px-3 py-1.5 rounded-xl">
                            <CheckCircle size={12} /> {t('job.accepted')}
                          </span>
                        ) : (
                          <button onClick={() => handleAccept(applicant.workerId)}
                            className="text-white text-xs font-black px-4 py-2 rounded-xl active:scale-95 transition-transform hover:opacity-90"
                            style={{ background: 'linear-gradient(135deg,#2952E8,#1A2DB8)' }}>
                            {t('job.accept')}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* No applicants message */}
        {isMyJob && job.applicants.length === 0 && (
          <div className="bg-blue-50 rounded-3xl p-5 border border-blue-100 text-center mb-5">
            <p className="text-blue-900 font-semibold text-sm">{t('job.noApplicants')}</p>
            <p className="text-blue-600 text-xs mt-1">{t('job.noApplicantsSub')}</p>
          </div>
        )}

        {/* Tukola Guarantee — the customer can claim on a completed job */}
        {isMyJob && job.status === 'completed' && (
          <GuaranteeClaimBlock jobId={job.id} />
        )}

        {/* Action buttons */}
        <div className="lg:flex lg:justify-end lg:gap-3">
          {isWorker && job.status === 'open' && (
            <>
              {isInvited ? (
                <button onClick={handleApply}
                  className="lg:w-auto w-full py-4 px-8 bg-green-600 text-white rounded-2xl font-bold text-base active:scale-95 transition-transform shadow-lg shadow-green-200 hover:bg-green-700 flex items-center justify-center gap-2">
                  <CheckCircle size={18} /> {t('worker.acceptInvite')}
                </button>
              ) : hasApplied ? (
                <div className="lg:w-auto w-full py-4 bg-green-50 rounded-2xl text-center text-green-600 font-bold text-base flex items-center justify-center gap-2">
                  <CheckCircle size={18} /> {t('worker.applied')}
                </div>
              ) : (
                <button onClick={handleApply}
                  className="lg:w-auto w-full py-4 px-8 bg-blue-600 text-white rounded-2xl font-bold text-base active:scale-95 transition-transform shadow-lg shadow-blue-200 hover:bg-blue-700">
                  {t('worker.apply')}
                </button>
              )}
            </>
          )}

          {isMyJob && job.status === 'in_progress' && (
            <Link href={`/completion/${job.id}`}
              className="lg:w-auto w-full block py-4 px-8 bg-green-600 text-white rounded-2xl font-bold text-base text-center active:scale-95 transition-transform shadow-lg shadow-green-200 hover:bg-green-700">
              {t('job.markComplete')}
            </Link>
          )}

          {isMyJob && job.status === 'completed' && (
            <div className="w-full lg:w-auto space-y-2">
              <button onClick={handleRebook} disabled={rebooking}
                className="lg:w-auto w-full py-4 px-8 bg-blue-600 text-white rounded-2xl font-bold text-base active:scale-95 transition-transform shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2">
                <RotateCcw size={18} /> {rebooking ? t('job.inviting') : t('job.rebook')}
              </button>
              <div className="flex items-center gap-2 justify-center lg:justify-start">
                <span className="text-slate-500 text-xs font-semibold">{t('job.repeatAuto')}</span>
                <button onClick={() => handleRecurring('weekly')}
                  className="text-xs font-black px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 active:scale-95 transition-transform">
                  {t('job.weekly')}
                </button>
                <button onClick={() => handleRecurring('biweekly')}
                  className="text-xs font-black px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 active:scale-95 transition-transform">
                  {t('job.biweekly')}
                </button>
              </div>
              {recurringMsg && (
                <p className="text-green-600 text-xs font-bold text-center lg:text-left">{recurringMsg}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
