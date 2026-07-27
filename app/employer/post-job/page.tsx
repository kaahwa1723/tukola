'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send, ChevronLeft } from 'lucide-react';
import { useKola } from '@/lib/store';
import { JOB_CATEGORIES } from '@/lib/constants';
import { UploadImagePicker } from '@/components/UploadImagePicker';

export default function PostJobPage() {
  const router = useRouter();
  const { user, postJob } = useKola();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    location: '',
    dateTime: '',
    workersNeeded: 1,
    pay: '',
    urgency: 'scheduled' as 'immediate' | 'scheduled',
    category: '',
  });
  const [jobImages, setJobImages] = useState<string[]>([]);

  const handleSubmit = () => {
    if (!form.title.trim() || !form.location.trim()) return;
    setLoading(true);

    setTimeout(() => {
      postJob({
        title: form.title,
        description: form.description,
        location: form.location,
        dateTime: form.dateTime || new Date().toISOString(),
        workersNeeded: form.workersNeeded,
        pay: form.pay ? parseInt(form.pay) : undefined,
        urgency: form.urgency,
        skills: form.category ? [form.category] : [],
        category: form.category || undefined,
        images: jobImages,
      });
      setLoading(false);
      setSuccess(true);
      setTimeout(() => router.push('/employer'), 1500);
    }, 1000);
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-[#F0F4FF]">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
            style={{ background: 'linear-gradient(135deg,#2952E8,#1A2DB8)' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
          </div>
          <h2 className="text-3xl font-black text-[#0A0F2C] mb-2">Job Posted!</h2>
          <p className="text-slate-500">Workers in your area are being notified right now.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F4FF]">
      <div className="max-w-2xl mx-auto px-4 lg:px-6 py-4 lg:py-8 pb-28 lg:pb-12">

        {/* Back button */}
        <button onClick={() => router.back()}
          className="flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-4">
          <ChevronLeft size={18} /> Back
        </button>

        {/* Step header */}
        <div className="rounded-2xl p-5 lg:p-6 relative overflow-hidden mb-5"
          style={{ background: 'linear-gradient(135deg,#2952E8,#1A2DB8)' }}>
          <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle,#00C8FF,transparent)' }} />
          <p className="text-blue-200 text-[11px] font-bold uppercase tracking-widest mb-1">New Listing</p>
          <h2 className="text-white font-black text-xl lg:text-2xl">What needs doing?</h2>
        </div>

        {/* Fields */}
        <div className="bg-white rounded-2xl lg:rounded-3xl p-4 lg:p-6 border border-blue-100/40 space-y-5 animate-slide-up"
          style={{ boxShadow: '0 2px 16px rgba(41,82,232,0.06)' }}>
          <div>
            <label className="text-[#0A0F2C] font-semibold text-sm mb-1.5 block">Job Title *</label>
            <input type="text" value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Need 2 people for home cleaning"
              className="w-full rounded-xl px-4 py-3 text-[#0A0F2C] text-sm placeholder-slate-400 focus:outline-none transition-colors border-[1.5px] border-slate-200 focus:border-blue-600 bg-slate-50 focus:bg-white"
            />
          </div>

          <div>
            <label className="text-[#0A0F2C] font-semibold text-sm mb-1.5 block">Description</label>
            <textarea value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              rows={3}
              placeholder="Describe the tasks, specific requirements, and any tools needed..."
              className="w-full rounded-xl px-4 py-3 text-[#0A0F2C] text-sm placeholder-slate-400 focus:outline-none transition-colors resize-none border-[1.5px] border-slate-200 focus:border-blue-600 bg-slate-50 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[#0A0F2C] font-semibold text-sm mb-1.5 block">Location *</label>
              <input type="text" value={form.location}
                onChange={e => setForm({ ...form, location: e.target.value })}
                placeholder="Street address or neighborhood"
                className="w-full rounded-xl px-4 py-3 text-[#0A0F2C] text-sm placeholder-slate-400 focus:outline-none border-[1.5px] border-slate-200 focus:border-blue-600 bg-slate-50 focus:bg-white"
              />
            </div>
            <div>
              <label className="text-[#0A0F2C] font-semibold text-sm mb-1.5 block">Date and Time</label>
              <input type="datetime-local" value={form.dateTime}
                onChange={e => setForm({ ...form, dateTime: e.target.value })}
                className="w-full rounded-xl px-4 py-3 text-[#0A0F2C] text-sm focus:outline-none border-[1.5px] border-slate-200 focus:border-blue-600 bg-slate-50 focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[#0A0F2C] font-semibold text-sm mb-1.5 block">Number of Workers</label>
              <input type="number" min="1" max="20" value={form.workersNeeded}
                onChange={e => setForm({ ...form, workersNeeded: parseInt(e.target.value) || 1 })}
                className="w-full rounded-xl px-4 py-3 text-[#0A0F2C] text-sm focus:outline-none border-[1.5px] border-slate-200 focus:border-blue-600 bg-slate-50 focus:bg-white"
              />
            </div>
            <div>
              <label className="text-[#0A0F2C] font-semibold text-sm mb-1.5 flex items-center justify-between">
                Pay (Optional)
                <span className="text-slate-400 text-xs font-normal">UGX</span>
              </label>
              <input type="number" value={form.pay}
                onChange={e => setForm({ ...form, pay: e.target.value })}
                placeholder="Suggested pay amount"
                className="w-full rounded-xl px-4 py-3 text-[#0A0F2C] text-sm placeholder-slate-400 focus:outline-none border-[1.5px] border-slate-200 focus:border-blue-600 bg-slate-50 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="text-[#0A0F2C] font-semibold text-sm mb-2 block">Category</label>
            <div className="flex flex-wrap gap-2">
              {JOB_CATEGORIES.map(cat => (
                <button key={cat}
                  onClick={() => setForm({ ...form, category: cat === form.category ? '' : cat })}
                  className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                  style={{
                    background: form.category === cat ? '#2952E8' : '#F0F4FF',
                    color: form.category === cat ? '#fff' : '#4A5580',
                  }}>
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <UploadImagePicker
              images={jobImages}
              onChange={setJobImages}
              maxImages={6}
              bucket="job-images"
              folder={`jobs/${user?.id || 'guest'}`}
              label="Job Photos (optional)"
              hint="Show workers what needs doing"
            />
          </div>

          <div>
            <label className="text-[#0A0F2C] font-semibold text-sm mb-2 block">Job Urgency</label>
            <div className="flex gap-3">
              {[{v:'scheduled',label:'Scheduled',color:'#2952E8'},{v:'immediate',label:'Urgent',color:'#DC2626'}].map(u => (
                <button key={u.v} onClick={() => setForm({ ...form, urgency: u.v as 'immediate'|'scheduled' })}
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

        {/* Submit button */}
        <div className="mt-6 lg:flex lg:justify-end">
          <button onClick={handleSubmit}
            disabled={!form.title.trim() || !form.location.trim() || loading}
            className="lg:w-auto w-full py-4 px-8 rounded-2xl font-black text-base flex items-center justify-center gap-2 active:scale-95 transition-all"
            style={{
              background: form.title.trim() && form.location.trim() ? 'linear-gradient(135deg,#2952E8,#1A2DB8)' : '#E2E6F0',
              color: form.title.trim() && form.location.trim() ? '#fff' : '#9BA3C0',
              boxShadow: form.title.trim() && form.location.trim() ? '0 6px 20px rgba(41,82,232,0.35)' : 'none',
            }}>
            {loading ? 'Posting...' : <><Send size={18} /> Post Job Now</>}
          </button>
        </div>
      </div>
    </div>
  );
}
