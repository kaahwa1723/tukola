'use client';

import { useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  MapPin, Calendar, Banknote, Phone, Users, Lock, ChevronLeft, CheckCircle,
  Images, Star, Briefcase, ShieldCheck, Wrench, Sparkles, Zap, Car, ChefHat,
  Leaf, Shield, Paintbrush, Package, Scissors, Truck, Hammer, Building2, Search,
  MessageCircle, RotateCcw
} from 'lucide-react';
import { useKola } from '@/lib/store';

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
  const { jobs, user, applyToJob, applications, acceptApplicant } = useKola();
  const router = useRouter();
  const [rebooking, setRebooking] = useState(false);
  const [recurringMsg, setRecurringMsg] = useState<string | null>(null);

  const job = jobs.find(j => j.id === id);

  if (!job) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F0F4FF]">
        <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center mb-3 shadow-sm">
          <Search size={28} color="#2952E8" />
        </div>
        <h2 className="text-slate-900 font-bold">Job not found</h2>
        <button onClick={() => router.back()} className="mt-4 text-blue-600 font-semibold">Go Back</button>
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

  const handleApply = () => applyToJob(job.id);
  const handleAccept = (applicantId: string) => acceptApplicant(job.id, applicantId);

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
        alert(data.error || 'Could not re-book this fundi. Please try again.');
      }
    } catch {
      alert('Network error. Please try again.');
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
            ? 'Set! This fundi will be invited back every week.'
            : 'Set! This fundi will be invited back every 2 weeks.'
        );
      } else {
        setRecurringMsg(data.error || 'Could not set up the recurring booking.');
      }
    } catch {
      setRecurringMsg('Network error. Please try again.');
    }
  };

  // Start (or reopen) a conversation with the counterparty, then go to messages.
  // Guarded against double-clicks — two parallel POSTs could both miss the
  // existing-conversation check and insert duplicates.
  const startingConv = useRef(false);
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
          <ChevronLeft size={18} /> Back
        </button>

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
                    {job.urgency === 'immediate' ? 'Urgent' : 'Scheduled'}
                  </span>
                </div>
                <p className="text-slate-500 text-sm mt-1">Posted by {job.employerName}</p>
              </div>
            </div>

            {/* Key details grid */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              {job.pay && (
                <div className="rounded-2xl p-3.5" style={{ background: '#F0F4FF' }}>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-blue-600 mb-1">Pay</p>
                  <p className="text-lg font-black text-[#0A0F2C]">UGX {job.pay.toLocaleString()}</p>
                </div>
              )}
              <div className="rounded-2xl p-3.5" style={{ background: '#F0F4FF' }}>
                <p className="text-[10px] font-bold uppercase tracking-wide text-blue-600 mb-1">Workers</p>
                <p className="text-lg font-black text-[#0A0F2C]">{job.workersNeeded} needed</p>
              </div>
              <div className="rounded-2xl p-3.5 col-span-2 lg:col-span-1" style={{ background: '#F0F4FF' }}>
                <p className="text-[10px] font-bold uppercase tracking-wide text-blue-600 mb-1">When</p>
                <p className="text-sm font-semibold text-[#0A0F2C]">
                  {new Date(job.dateTime).toLocaleString('en-UG', {
                    weekday: 'long', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                </p>
              </div>
              <div className="rounded-2xl p-3.5 col-span-2 lg:col-span-1" style={{ background: '#F0F4FF' }}>
                <p className="text-[10px] font-bold uppercase tracking-wide text-blue-600 mb-1">Where</p>
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
                  <Images size={14} color="#2952E8" /> Job Photos
                </h3>
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                  {job.images.map((src, i) => (
                    <div key={i} className="flex-shrink-0 w-28 h-28 lg:w-36 lg:h-36 rounded-xl overflow-hidden"
                      style={{ border: '1px solid rgba(41,82,232,0.1)' }}>
                      <img src={src} alt={`Job photo ${i + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {job.description && (
              <div className="mb-5">
                <h3 className="text-sm font-bold text-[#0A0F2C] mb-2">Description</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{job.description}</p>
              </div>
            )}

            {/* Skills */}
            {job.skills && job.skills.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-[#0A0F2C] mb-2">Skills Needed</h3>
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
            <h3 className="font-bold text-[#0A0F2C] mb-3">Employer</h3>
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
                      <Lock size={10} /> Phone unlocks after payment is held in escrow
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => startConversation(job.employerId, job.employerName)}
                  aria-label="Message Employer"
                  className="w-11 h-11 bg-blue-50 rounded-2xl flex items-center justify-center active:scale-95 transition-transform hover:bg-blue-100">
                  <MessageCircle size={18} className="text-blue-600" />
                </button>
                {job.employerPhone && (
                  <a href={`tel:${job.employerPhone}`}
                    aria-label="Call Employer"
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
            <h3 className="font-bold text-[#0A0F2C] mb-3">Applicants ({job.applicants.length})</h3>
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
                            <span className="flex items-center gap-0.5 text-xs text-yellow-600">
                              <Star size={11} className="fill-yellow-500 text-yellow-500" /> {applicant.rating}
                            </span>
                            <span className="text-xs text-slate-400">({applicant.completedJobs} jobs)</span>
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
                          aria-label={`Message ${applicant.workerName}`}
                          className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center active:scale-95 transition-transform hover:bg-blue-100">
                          <MessageCircle size={15} className="text-blue-600" />
                        </button>
                        {applicant.status === 'accepted' ? (
                          <span className="flex items-center gap-1 text-green-600 text-xs font-bold bg-green-50 px-3 py-1.5 rounded-xl">
                            <CheckCircle size={12} /> Accepted
                          </span>
                        ) : (
                          <button onClick={() => handleAccept(applicant.workerId)}
                            className="text-white text-xs font-black px-4 py-2 rounded-xl active:scale-95 transition-transform hover:opacity-90"
                            style={{ background: 'linear-gradient(135deg,#2952E8,#1A2DB8)' }}>
                            Accept
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
            <p className="text-blue-900 font-semibold text-sm">No applicants yet</p>
            <p className="text-blue-600 text-xs mt-1">Workers nearby are being notified</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="lg:flex lg:justify-end lg:gap-3">
          {isWorker && job.status === 'open' && (
            <>
              {isInvited ? (
                <button onClick={handleApply}
                  className="lg:w-auto w-full py-4 px-8 bg-green-600 text-white rounded-2xl font-bold text-base active:scale-95 transition-transform shadow-lg shadow-green-200 hover:bg-green-700 flex items-center justify-center gap-2">
                  <CheckCircle size={18} /> Accept Invitation — Start Job
                </button>
              ) : hasApplied ? (
                <div className="lg:w-auto w-full py-4 bg-green-50 rounded-2xl text-center text-green-600 font-bold text-base flex items-center justify-center gap-2">
                  <CheckCircle size={18} /> Applied Successfully
                </div>
              ) : (
                <button onClick={handleApply}
                  className="lg:w-auto w-full py-4 px-8 bg-blue-600 text-white rounded-2xl font-bold text-base active:scale-95 transition-transform shadow-lg shadow-blue-200 hover:bg-blue-700">
                  Apply for this Job
                </button>
              )}
            </>
          )}

          {isMyJob && job.status === 'in_progress' && (
            <Link href={`/completion/${job.id}`}
              className="lg:w-auto w-full block py-4 px-8 bg-green-600 text-white rounded-2xl font-bold text-base text-center active:scale-95 transition-transform shadow-lg shadow-green-200 hover:bg-green-700">
              Mark Job as Complete
            </Link>
          )}

          {isMyJob && job.status === 'completed' && (
            <div className="w-full lg:w-auto space-y-2">
              <button onClick={handleRebook} disabled={rebooking}
                className="lg:w-auto w-full py-4 px-8 bg-blue-600 text-white rounded-2xl font-bold text-base active:scale-95 transition-transform shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2">
                <RotateCcw size={18} /> {rebooking ? 'Inviting fundi…' : 'Book this fundi again'}
              </button>
              <div className="flex items-center gap-2 justify-center lg:justify-start">
                <span className="text-slate-500 text-xs font-semibold">Repeat automatically:</span>
                <button onClick={() => handleRecurring('weekly')}
                  className="text-xs font-black px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 active:scale-95 transition-transform">
                  Weekly
                </button>
                <button onClick={() => handleRecurring('biweekly')}
                  className="text-xs font-black px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 active:scale-95 transition-transform">
                  Every 2 weeks
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
