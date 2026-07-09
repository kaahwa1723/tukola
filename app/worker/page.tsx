'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  MapPin, Clock, Banknote, Search, Wrench, Zap,
  Sparkles, Building2, Car, ChefHat, Leaf, Shield,
  Paintbrush, Package, Scissors, Truck, CheckCircle, ChevronRight,
  Bell, TrendingUp, Star
} from 'lucide-react';
import { useKola } from '@/lib/store';
import { Job } from '@/lib/types';

const CATEGORIES = [
  { label: 'Plumbing', Icon: Wrench, color: '#2952E8', bg: '#EEF2FF' },
  { label: 'Electrical', Icon: Zap, color: '#D97706', bg: '#FFFBEB' },
  { label: 'Cleaning', Icon: Sparkles, color: '#059669', bg: '#ECFDF5' },
  { label: 'Construction', Icon: Building2, color: '#7C3AED', bg: '#F5F3FF' },
  { label: 'Driving', Icon: Car, color: '#DC2626', bg: '#FEF2F2' },
  { label: 'Cooking', Icon: ChefHat, color: '#EA580C', bg: '#FFF7ED' },
  { label: 'Gardening', Icon: Leaf, color: '#16A34A', bg: '#F0FDF4' },
  { label: 'Security', Icon: Shield, color: '#0F172A', bg: '#F1F5F9' },
  { label: 'Painting', Icon: Paintbrush, color: '#9333EA', bg: '#FAF5FF' },
  { label: 'Moving', Icon: Package, color: '#0369A1', bg: '#F0F9FF' },
  { label: 'Tailoring', Icon: Scissors, color: '#BE185D', bg: '#FDF2F8' },
  { label: 'Logistics', Icon: Truck, color: '#065F46', bg: '#ECFDF5' },
];

function getCategoryMeta(title: string) {
  const lower = title.toLowerCase();
  if (lower.includes('clean')) return CATEGORIES[2];
  if (lower.includes('plumb') || lower.includes('pipe')) return CATEGORIES[0];
  if (lower.includes('electr')) return CATEGORIES[1];
  if (lower.includes('build') || lower.includes('construct') || lower.includes('mason')) return CATEGORIES[3];
  if (lower.includes('driv') || lower.includes('deliver')) return CATEGORIES[4];
  if (lower.includes('cook') || lower.includes('chef') || lower.includes('cater')) return CATEGORIES[5];
  if (lower.includes('garden') || lower.includes('lawn')) return CATEGORIES[6];
  if (lower.includes('secur') || lower.includes('guard')) return CATEGORIES[7];
  if (lower.includes('paint')) return CATEGORIES[8];
  if (lower.includes('mov') || lower.includes('pack')) return CATEGORIES[9];
  return CATEGORIES[3];
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  const isToday = new Date().toDateString() === date.toDateString();
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (isToday) return `Today ${time}`;
  return `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()]} ${time}`;
}

function JobCard({ job, applied, onApply }: { job: Job; applied: boolean; onApply: () => void }) {
  const cat = getCategoryMeta(job.title);
  const CatIcon = cat.Icon;

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-blue-100/40 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
      {/* Top accent strip */}
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${cat.color}, #2952E8)` }} />

      {/* Job image preview if available */}
      {job.images && job.images.length > 0 && (
        <div className="relative h-36 w-full overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={job.images[0]} alt={job.title} className="w-full h-full object-cover" />
          <div className="absolute bottom-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/90 text-[#0A0F2C] shadow-sm">
            {job.images.length} photo{job.images.length > 1 ? 's' : ''}
          </div>
        </div>
      )}

      <div className="p-4 lg:p-5">
        {/* Header row */}
        <div className="flex items-start gap-3 mb-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: cat.bg }}>
            <CatIcon size={20} color={cat.color} strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <Link href={`/job/${job.id}`}>
              <h3 className="font-bold text-[#0A0F2C] text-[15px] leading-snug hover:text-[#2952E8] transition-colors cursor-pointer">
                {job.title}
              </h3>
            </Link>
            <div className="flex items-center gap-1.5 mt-0.5">
              {job.employerAvatar ? (
                <div className="w-4 h-4 rounded-full overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={job.employerAvatar} alt="" className="w-full h-full object-cover" />
                </div>
              ) : null}
              <p className="text-[#8B94B8] text-xs font-medium">{job.employerName}</p>
            </div>
          </div>
          {job.urgency === 'immediate' && (
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 tracking-wide uppercase"
              style={{ background: '#FFF1F0', color: '#DC2626' }}>
              Urgent
            </span>
          )}
        </div>

        {/* Details row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3.5">
          {job.pay && (
            <span className="flex items-center gap-1.5 text-[13px] font-bold text-[#0A0F2C]">
              <Banknote size={13} color="#2952E8" strokeWidth={2} />
              UGX {job.pay.toLocaleString()}
            </span>
          )}
          <span className="flex items-center gap-1.5 text-[12px] font-medium text-[#4A5580]">
            <Clock size={12} color="#8B94B8" strokeWidth={2} />
            {formatTime(job.dateTime)}
          </span>
          <span className="flex items-center gap-1.5 text-[12px] font-medium text-[#4A5580]">
            <MapPin size={12} color="#8B94B8" strokeWidth={2} />
            {job.location}
          </span>
        </div>

        {/* Skills */}
        {job.skills && job.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {job.skills.slice(0, 3).map(s => (
              <span key={s} className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                style={{ background: '#F0F4FF', color: '#2952E8' }}>
                {s}
              </span>
            ))}
          </div>
        )}

        {/* CTA */}
        {applied ? (
          <div className="w-full py-3 rounded-xl flex items-center justify-center gap-2 bg-green-50 text-green-600">
            <CheckCircle size={15} strokeWidth={2.5} />
            <span className="text-sm font-bold">Applied</span>
          </div>
        ) : (
          <button onClick={onApply}
            className="w-full py-3 rounded-xl text-white text-sm font-bold cursor-pointer transition-all active:scale-[0.98] hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #2952E8, #1A2DB8)', boxShadow: '0 4px 16px rgba(41,82,232,0.3)' }}>
            Apply Now
          </button>
        )}
      </div>
    </div>
  );
}

export default function WorkerHomePage() {
  const { user, jobs, applyToJob, applications } = useKola();
  const [localApps, setLocalApps] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => { setLocalApps(applications); }, [applications]);

  const firstName = user?.name?.split(' ')[0] || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const openJobs = jobs.filter(j => j.status === 'open');
  const urgentCount = openJobs.filter(j => j.urgency === 'immediate').length;

  const filtered = openJobs.filter(j => {
    const matchSearch = !search || j.title.toLowerCase().includes(search.toLowerCase()) || j.location.toLowerCase().includes(search.toLowerCase());
    const matchCat = !activeCategory || getCategoryMeta(j.title).label === activeCategory;
    return matchSearch && matchCat;
  });

  const handleApply = (jobId: string) => {
    applyToJob(jobId);
    setLocalApps(prev => [...prev, jobId]);
  };

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── HERO GREETING ────────────────────────── */}
      <div className="rounded-3xl p-5 lg:p-8 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #00C8FF 0%, #2952E8 55%, #1A2DB8 100%)' }}>
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <p className="text-white/70 text-sm font-semibold">{greeting},</p>
              <h1 className="text-2xl lg:text-3xl font-extrabold text-white mt-0.5">{firstName}</h1>
              <p className="flex items-center gap-1.5 text-white/60 text-xs font-medium mt-1.5">
                <MapPin size={11} color="rgba(255,255,255,0.6)" />
                {user?.location || 'Kampala, Uganda'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl px-4 py-2.5" style={{ background: 'rgba(255,255,255,0.15)' }}>
                <p className="text-white/60 text-[10px] font-semibold uppercase tracking-wide">Completed</p>
                <p className="text-white text-xl font-extrabold">{user?.completedJobs ?? 0}</p>
              </div>
              <div className="rounded-2xl px-4 py-2.5" style={{ background: 'rgba(255,255,255,0.15)' }}>
                <p className="text-white/60 text-[10px] font-semibold uppercase tracking-wide">Rating</p>
                <p className="text-white text-xl font-extrabold">{user?.rating?.toFixed(1) ?? '—'}</p>
              </div>
              <Link href="/worker/jobs" className="hidden lg:flex items-center gap-1 text-white/80 text-xs font-bold cursor-pointer hover:text-white transition-colors">
                My Jobs <ChevronRight size={13} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── SEARCH ───────────────────────────────── */}
      <div className="flex items-center gap-3 rounded-2xl px-4 py-3.5 bg-white"
        style={{ boxShadow: '0 2px 12px rgba(41,82,232,0.07)', border: '1.5px solid rgba(41,82,232,0.1)' }}>
        <Search size={17} color="#8B94B8" strokeWidth={2} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search jobs, skills, location..."
          className="flex-1 bg-transparent text-sm font-medium placeholder-[#C0C8E0] outline-none"
          style={{ color: '#0A0F2C' }}
        />
      </div>

      {/* ── CATEGORIES ───────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-extrabold text-[#0A0F2C] text-base">Browse by Service</h2>
          {activeCategory && (
            <button onClick={() => setActiveCategory(null)} className="text-xs font-bold cursor-pointer text-blue-600 hover:text-blue-700">
              Clear filter
            </button>
          )}
        </div>
        {/* Mobile: horizontal scroll. Desktop: grid */}
        <div className="flex lg:grid lg:grid-cols-6 gap-3 overflow-x-auto lg:overflow-visible scrollbar-hide pb-1">
          {CATEGORIES.map(cat => {
            const CatIcon = cat.Icon;
            const active = activeCategory === cat.label;
            return (
              <button key={cat.label} onClick={() => setActiveCategory(active ? null : cat.label)}
                className="flex flex-col items-center gap-2 flex-shrink-0 lg:flex-shrink cursor-pointer transition-transform active:scale-95">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all"
                  style={{
                    background: active ? cat.color : cat.bg,
                    boxShadow: active ? `0 6px 20px ${cat.color}44` : 'none',
                    border: active ? 'none' : `1.5px solid ${cat.bg}`,
                  }}>
                  <CatIcon size={22} color={active ? '#fff' : cat.color} strokeWidth={1.8} />
                </div>
                <span className="text-[10px] font-bold text-center leading-tight whitespace-nowrap"
                  style={{ color: active ? cat.color : '#4A5580' }}>
                  {cat.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── URGENT BANNER ────────────────────────── */}
      {urgentCount > 0 && !search && !activeCategory && (
        <div className="rounded-2xl px-4 py-3.5 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, #FFF1F0, #FFE4E1)', border: '1.5px solid rgba(220,38,38,0.15)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-red-500">
              <Zap size={15} color="white" fill="white" />
            </div>
            <div>
              <p className="text-sm font-bold text-red-600">{urgentCount} urgent job{urgentCount > 1 ? 's' : ''} near you</p>
              <p className="text-[11px] font-medium text-red-800">Employers need workers right now</p>
            </div>
          </div>
          <ChevronRight size={16} color="#DC2626" />
        </div>
      )}

      {/* ── JOB LISTINGS ─────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-extrabold text-[#0A0F2C] text-base">
            {activeCategory ? `${activeCategory} Jobs` : 'Available Near You'}
            {filtered.length > 0 && (
              <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                {filtered.length}
              </span>
            )}
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map(job => (
            <JobCard key={job.id} job={job} applied={localApps.includes(job.id)} onApply={() => handleApply(job.id)} />
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-14 rounded-3xl bg-white lg:col-span-2">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-blue-50">
                <Search size={24} color="#2952E8" />
              </div>
              <p className="font-bold text-[#0A0F2C] text-base">No jobs found</p>
              <p className="text-[#8B94B8] text-sm mt-1 font-medium">Try a different search or category</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
