'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MapPin, Star, CheckCircle, Clock, Zap, ChevronLeft, Send, ShieldCheck, Images } from 'lucide-react';
import { useKola } from '@/lib/store';
import { MOCK_WORKERS } from '@/lib/data';
import { ImagePicker } from '@/components/ImagePicker';

export default function HireWorkerPage() {
  const { workerId } = useParams<{ workerId: string }>();
  const { user, postJob } = useKola();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const worker = MOCK_WORKERS.find(w => w.id === workerId);

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

  if (!worker) {
    return (
      <div className="mobile-container min-h-screen flex flex-col items-center justify-center gap-3">
        <p className="text-gray-500 font-semibold">Worker not found</p>
        <button onClick={() => router.back()} className="text-[#2952E8] font-bold text-sm">← Go back</button>
      </div>
    );
  }

  const handleHire = () => {
    if (!form.title.trim() || !form.location.trim()) return;
    setLoading(true);
    setTimeout(() => {
      postJob({
        title: form.title,
        description: form.description,
        location: form.location,
        dateTime: form.dateTime || new Date().toISOString(),
        workersNeeded: 1,
        pay: form.pay ? parseInt(form.pay) : undefined,
        urgency: form.urgency,
        employerId: user?.id || 'e1',
        employerName: user?.name || 'Employer',
        employerPhone: user?.phone,
        skills: worker.skills || [],
        images: jobImages,
      });
      setLoading(false);
      setSuccess(true);
      setTimeout(() => router.push('/employer'), 2500);
    }, 1000);
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
          <p className="text-blue-200 mb-1">{worker.name} is being notified.</p>
          <p className="text-blue-300/60 text-xs">Redirecting to your dashboard…</p>
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
                {worker.isVerified && (
                  <ShieldCheck size={15} color="#00C8FF" strokeWidth={2} />
                )}
              </div>
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
            <ImagePicker
              images={jobImages}
              onChange={setJobImages}
              maxImages={6}
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
