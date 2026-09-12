'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { MapPin, Star, CheckCircle, Clock, Zap, ChevronLeft, Send, Images, Gauge, Tag } from 'lucide-react';
import { useKola } from '@/lib/store';
import { useI18n } from '@/lib/i18n';
import { MOCK_WORKERS } from '@/lib/data';
import type { User } from '@/lib/types';
import { UploadImagePicker } from '@/components/UploadImagePicker';
import VerifiedBadge from '@/components/VerifiedBadge';
import { formatUgx } from '@/lib/pricing';

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

export default function HireWorkerPage() {
  const { workerId } = useParams<{ workerId: string }>();
  const { user, postJob } = useKola();
  const { t } = useI18n();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Look up the real worker profile first; mock workers only in demo mode
  const [worker, setWorker] = useState<User | null>(null);
  const [workerLoaded, setWorkerLoaded] = useState(false);
  // The worker's priced listings — an employer who found this fundi via
  // FundiFinder can book a listed service (fixed price, one tap) instead
  // of writing a job description from scratch.
  const [services, setServices] = useState<{ id: string; title: string; unitLabel: string | null; priceUgx: number }[]>([]);

  useEffect(() => {
    fetch(`/api/users/${workerId}`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data?.user) setWorker(data.user);
        else if (DEMO_MODE) setWorker(MOCK_WORKERS.find(w => w.id === workerId) ?? null);
      })
      .catch(() => {
        if (DEMO_MODE) setWorker(MOCK_WORKERS.find(w => w.id === workerId) ?? null);
      })
      .finally(() => setWorkerLoaded(true));
    fetch(`/api/services?workerId=${workerId}&limit=10`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => { if (data?.services) setServices(data.services); })
      .catch(() => {});
  }, [workerId]);

  const [form, setForm] = useState({
    title: '',
    description: '',
    location: user?.location || '',
    pay: '',
    dateTime: '',
    urgency: 'scheduled' as 'immediate' | 'scheduled',
  });
  const [jobImages, setJobImages] = useState<string[]>([]);

  const fieldStyle = { border: '1.5px solid #E2E6F0' };
  const focusField = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = '#2952E8';
  };
  const blurField = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = '#E2E6F0';
  };

  if (!workerLoaded) {
    return (
      <div className="mobile-container min-h-screen flex items-center justify-center">
        <p className="text-gray-400 font-semibold text-sm">Loading worker…</p>
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="mobile-container min-h-screen flex flex-col items-center justify-center gap-3">
        <p className="text-gray-500 font-semibold">Worker not found</p>
        <button onClick={() => router.back()} className="text-[#2952E8] font-bold text-sm">← Go back</button>
      </div>
    );
  }

  const handleHire = async () => {
    if (!form.title.trim() || !form.location.trim()) return;
    // A hire request without a logged-in employer would post an orphaned job
    // and silently fail the invite — send them to login instead
    if (!user) {
      router.push('/login');
      return;
    }
    setLoading(true);

    const jobTitle = form.title.trim();
    const job = postJob({
      title: jobTitle,
      description: form.description,
      location: form.location,
      dateTime: form.dateTime || new Date().toISOString(),
      workersNeeded: 1,
      pay: form.pay ? parseInt(form.pay) : undefined,
      urgency: form.urgency,
      skills: worker.skills || [],
      images: jobImages,
    });

    // Notify the worker: open a conversation on this job and send the invite
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: job.id,
          jobTitle,
          user2Id: worker.id,
        }),
      });
      const data = await res.json().catch(() => null);
      const convId = data?.conversation?.id;

      if (convId && user) {
        const when = new Date(form.dateTime || Date.now()).toLocaleDateString('en-UG', {
          month: 'short', day: 'numeric',
        });
        await fetch(`/api/messages/${convId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `Hi ${worker.name}, I'd like to hire you for '${jobTitle}' on ${when} in ${form.location} — UGX ${form.pay || 'negotiable'}. Reply here to confirm.`,
          }),
        });
      }
    } catch (e) {
      console.warn('[hire invite]', e);
    }

    setLoading(false);
    setSuccess(true);
    setTimeout(() => router.push('/employer/messages'), 2500);
  };

  if (success) {
    return (
      <div className="mobile-container min-h-screen flex flex-col items-center justify-center px-6"
        style={{ background: 'linear-gradient(135deg,#0A0F2C,#2952E8)' }}>
        <div className="text-center">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
            style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h2 className="text-3xl font-black text-white mb-2">Request Sent!</h2>
          <p className="text-blue-200 mb-1">Your invitation was sent to {worker.name}&apos;s inbox.</p>
          <p className="text-blue-300/60 text-xs">Redirecting to your messages…</p>
        </div>
      </div>
    );
  }

  const canSubmit = form.title.trim() && form.location.trim();

  return (
    <div className="mobile-container min-h-screen bg-[#F7F9FF]">

      {/* Header */}
      <header className="sticky top-0 z-40 h-14 px-4 flex items-center gap-3"
        style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(41,82,232,0.07)' }}>
        <button onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-xl active:bg-gray-100 transition-colors">
          <ChevronLeft size={22} color="#2952E8" strokeWidth={2.5} />
        </button>
        <span className="font-black text-base text-[#0A0F2C]">Hire Worker</span>
      </header>

      <div className="px-4 py-4 space-y-4 pb-32">

        {/* Worker profile card */}
        <div className="rounded-2xl overflow-hidden"
          style={{ background: 'linear-gradient(135deg,#2952E8,#1A2DB8)' }}>
          <div className="p-5 flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.18)' }}>
              <span className="text-white font-black text-2xl">{worker.name.charAt(0)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h2 className="text-white font-black text-lg leading-tight">{worker.name}</h2>
              </div>
              {/* Shown ONLY when the admin team has set is_verified — the
                  copy states exactly what verification means, no more. */}
              {worker.isVerified && (
                <div className="mb-1.5">
                  <VerifiedBadge variant="full" dark />
                </div>
              )}
              <p className="text-blue-200 text-xs flex items-center gap-1 mb-2">
                <MapPin size={10} /> {worker.location}
              </p>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-white/80 text-xs font-semibold">
                  <Star size={11} fill="white" color="white" /> {worker.rating}
                </span>
                <span className="text-white/50 text-xs">·</span>
                <span className="flex items-center gap-1 text-white/70 text-xs">
                  <Zap size={10} color="white" /> {worker.completedJobs} jobs done
                </span>
                <span className="text-white/50 text-xs">·</span>
                <span className="flex items-center gap-1 text-white/70 text-xs">
                  <Gauge size={10} color="white" /> Reliability: {worker.reliabilityScore != null ? worker.reliabilityScore : 'New'}
                </span>
                <span className="text-white/50 text-xs">·</span>
                <span className="flex items-center gap-1 text-white/70 text-xs">
                  <Clock size={10} color="white" /> {worker.responseTime}
                </span>
              </div>
            </div>
          </div>

          {/* About */}
          {worker.about && (
            <div className="px-5 pb-3">
              <p className="text-white/60 text-xs leading-relaxed line-clamp-2">{worker.about}</p>
            </div>
          )}

          {/* Skills */}
          {worker.skills && worker.skills.length > 0 && (
            <div className="px-5 pb-4 flex flex-wrap gap-2">
              {worker.skills.map(s => (
                <span key={s} className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Worker's price list — book a listed service in one tap */}
        {services.length > 0 && (
          <div className="bg-white rounded-2xl p-4"
            style={{ border: '1px solid #E8EDF8', boxShadow: '0 2px 16px rgba(41,82,232,0.06)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Tag size={16} color="#2952E8" />
              <h3 className="font-black text-[#0A0F2C] text-base">{t('hire.priceList', { name: worker.name.split(' ')[0] })}</h3>
            </div>
            <div className="space-y-2">
              {services.map(s => (
                <Link key={s.id} href={`/employer/book/${s.id}`}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#F7F9FF] border border-blue-100/60 active:scale-[0.98] transition-transform">
                  <div className="min-w-0">
                    <p className="font-bold text-[#0A0F2C] text-sm truncate">{s.title}</p>
                    <p className="font-black text-[#2952E8] text-xs mt-0.5">
                      {formatUgx(s.priceUgx)}{s.unitLabel ? ` · ${s.unitLabel}` : ''}
                    </p>
                  </div>
                  <span className="flex-shrink-0 text-[11px] font-black text-white px-3 py-1.5 rounded-full"
                    style={{ background: 'linear-gradient(135deg,#2952E8,#1A2DB8)' }}>
                    {t('svcb.book')}
                  </span>
                </Link>
              ))}
            </div>
            <p className="text-[#8B94B8] text-[11px] mt-2.5">{t('hire.priceListNote')}</p>
          </div>
        )}

        {/* Job details form */}
        <div className="bg-white rounded-2xl p-4 space-y-4"
          style={{ border: '1px solid #E8EDF8', boxShadow: '0 2px 16px rgba(41,82,232,0.06)' }}>

          <div>
            <h3 className="font-black text-[#0A0F2C] text-base mb-0.5">Describe the job</h3>
            <p className="text-gray-400 text-xs">Tell {worker.name.split(' ')[0]} what needs to be done</p>
          </div>

          <div>
            <label className="text-[#0A0F2C] font-semibold text-sm mb-1.5 block">Job Title *</label>
            <input
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder={`e.g. Need ${worker.skills?.[0] || 'help'} at my home`}
              className="w-full rounded-xl px-4 py-3 text-[#0A0F2C] text-sm placeholder-gray-400 focus:outline-none"
              style={fieldStyle}
              onFocus={focusField}
              onBlur={blurField}
            />
          </div>

          <div>
            <label className="text-[#0A0F2C] font-semibold text-sm mb-1.5 block">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              rows={3}
              placeholder="Any specific requirements, tools needed, hours expected…"
              className="w-full rounded-xl px-4 py-3 text-[#0A0F2C] text-sm placeholder-gray-400 focus:outline-none resize-none"
              style={fieldStyle}
              onFocus={focusField}
              onBlur={blurField}
            />
          </div>

          <div>
            <label className="text-[#0A0F2C] font-semibold text-sm mb-1.5 block">Location *</label>
            <input
              value={form.location}
              onChange={e => setForm({ ...form, location: e.target.value })}
              placeholder="Street or neighbourhood"
              className="w-full rounded-xl px-4 py-3 text-[#0A0F2C] text-sm placeholder-gray-400 focus:outline-none"
              style={fieldStyle}
              onFocus={focusField}
              onBlur={blurField}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[#0A0F2C] font-semibold text-sm mb-1.5 block">Pay (UGX)</label>
              <input
                type="number"
                value={form.pay}
                onChange={e => setForm({ ...form, pay: e.target.value })}
                placeholder="e.g. 80000"
                className="w-full rounded-xl px-4 py-3 text-[#0A0F2C] text-sm placeholder-gray-400 focus:outline-none"
                style={fieldStyle}
                onFocus={focusField}
                onBlur={blurField}
              />
            </div>
            <div>
              <label className="text-[#0A0F2C] font-semibold text-sm mb-1.5 block">Date & Time</label>
              <input
                type="datetime-local"
                value={form.dateTime}
                onChange={e => setForm({ ...form, dateTime: e.target.value })}
                className="w-full rounded-xl px-4 py-3 text-[#0A0F2C] text-sm focus:outline-none"
                style={fieldStyle}
                onFocus={focusField}
                onBlur={blurField}
              />
            </div>
          </div>

          {/* Job photos */}
          <div>
            <UploadImagePicker
              images={jobImages}
              onChange={setJobImages}
              maxImages={6}
              bucket="job-images"
              folder={`jobs/${user?.id || 'guest'}`}
              label="Job Photos (optional)"
              hint="Show the worker what needs doing"
            />
          </div>

          <div>
            <label className="text-[#0A0F2C] font-semibold text-sm mb-2 block">Urgency</label>
            <div className="flex gap-3">
              {[
                { v: 'scheduled', label: 'Scheduled', color: '#2952E8' },
                { v: 'immediate', label: 'Urgent Now', color: '#DC2626' },
              ].map(u => (
                <button key={u.v}
                  onClick={() => setForm({ ...form, urgency: u.v as 'immediate' | 'scheduled' })}
                  className="flex-1 py-3 rounded-xl text-sm font-black border-2 transition-all"
                  style={{
                    borderColor: form.urgency === u.v ? u.color : '#E2E6F0',
                    background: form.urgency === u.v ? u.color : '#fff',
                    color: form.urgency === u.v ? '#fff' : '#4A5580',
                  }}>
                  {u.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Fixed bottom CTA */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-4 py-4"
        style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(16px)', borderTop: '1px solid rgba(41,82,232,0.08)' }}>
        <button
          onClick={handleHire}
          disabled={!canSubmit || loading}
          className="w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 active:scale-95 transition-all"
          style={{
            background: canSubmit ? 'linear-gradient(135deg,#2952E8,#1A2DB8)' : '#E2E6F0',
            color: canSubmit ? '#fff' : '#9BA3C0',
            boxShadow: canSubmit ? '0 6px 20px rgba(41,82,232,0.35)' : 'none',
          }}>
          {loading ? 'Sending request…' : <><Send size={18} /> Hire {worker.name.split(' ')[0]}</>}
        </button>
      </div>
    </div>
  );
}
