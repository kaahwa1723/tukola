'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, MapPin, Users, ChevronRight, Briefcase, Repeat, Pause, Play } from 'lucide-react';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { useKola } from '@/lib/store';

interface RecurringTemplate {
  id: string;
  title: string;
  location: string;
  pay: number | null;
  frequency: 'weekly' | 'biweekly';
  next_run_on: string;
  active: boolean;
  worker?: { name: string };
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function EmployerJobsPage() {
  const { jobs, user } = useKola();
  const [filter, setFilter] = useState<'all' | 'open' | 'in_progress' | 'completed'>('all');
  const [templates, setTemplates] = useState<RecurringTemplate[]>([]);

  const myJobs = jobs.filter(j => j.employerId === user?.id);
  const filtered = filter === 'all' ? myJobs : myJobs.filter(j => j.status === filter);

  const loadTemplates = async () => {
    try {
      const res = await fetch('/api/recurring');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates ?? []);
      }
    } catch { /* non-fatal */ }
  };

  useEffect(() => { loadTemplates(); }, []);

  const toggleTemplate = async (t: RecurringTemplate) => {
    try {
      const res = await fetch(`/api/recurring/${t.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !t.active }),
      });
      if (res.ok) loadTemplates();
    } catch { /* non-fatal */ }
  };

  const statusLabel: Record<string, { label: string; color: string }> = {
    open: { label: 'OPEN', color: 'bg-blue-100 text-blue-700' },
    in_progress: { label: 'IN PROGRESS', color: 'bg-orange-100 text-orange-600' },
    completed: { label: 'DONE', color: 'bg-green-100 text-green-700' },
    cancelled: { label: 'CANCELLED', color: 'bg-red-100 text-red-600' },
  };

  return (
    <div className="pb-nav lg:pb-0">
      <MobileHeader title="My Jobs" showNotification />

      {/* Filter tabs */}
      <div className="bg-white border-b border-slate-100 px-4 overflow-x-auto scrollbar-hide">
        <div className="flex gap-1 py-2 min-w-max max-w-4xl lg:mx-auto">
          {(['all', 'open', 'in_progress', 'completed'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap ${
                filter === f ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {f === 'all' ? 'All Jobs' : f === 'in_progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
              <span className={`ml-1.5 text-xs ${filter === f ? 'text-blue-200' : 'text-slate-400'}`}>
                ({f === 'all' ? myJobs.length : myJobs.filter(j => j.status === f).length})
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 lg:px-6 py-4 space-y-3 max-w-4xl lg:mx-auto">
        {/* Recurring bookings */}
        {templates.length > 0 && (
          <div className="mb-5">
            <h2 className="text-slate-900 font-black text-sm mb-2 flex items-center gap-1.5">
              <Repeat size={14} className="text-blue-600" /> Recurring Bookings
            </h2>
            <div className="space-y-2">
              {templates.map(t => (
                <div key={t.id} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 text-sm truncate">{t.title}</p>
                    <p className="text-slate-500 text-xs mt-0.5">
                      {t.worker?.name ?? 'Fundi'} · {t.frequency === 'weekly' ? 'Weekly' : 'Every 2 weeks'}
                      {t.pay ? ` · UGX ${t.pay.toLocaleString()}` : ''}
                    </p>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      {t.active ? `Next: ${DAY_NAMES[new Date(`${t.next_run_on}T00:00:00`).getDay()]} ${t.next_run_on}` : 'Paused'}
                    </p>
                  </div>
                  <button onClick={() => toggleTemplate(t)}
                    className={`flex items-center gap-1 text-xs font-black px-3 py-2 rounded-xl active:scale-95 transition-transform flex-shrink-0 ${
                      t.active ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'
                    }`}>
                    {t.active ? <><Pause size={12} /> Pause</> : <><Play size={12} /> Resume</>}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <Briefcase size={30} color="#2952E8" />
            </div>
            <p className="empty-title">No {filter !== 'all' ? filter.replace('_', ' ') : ''} jobs</p>
            {filter === 'all' && (
              <p className="empty-sub">Post your first job to start hiring.</p>
            )}
            <Link
              href="/employer/post-job"
              className="btn-gradient mt-5 px-6 py-3 rounded-xl text-sm inline-flex items-center gap-2"
            >
              <Plus size={16} /> Post a Job
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 animate-slide-up-d1">
            {filtered.map(job => {
              const stat = statusLabel[job.status] || statusLabel.open;
              return (
                <Link href={`/job/${job.id}`} key={job.id}>
                  <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold text-slate-900 text-sm flex-1 pr-2">{job.title}</h3>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0 ${stat.color}`}>
                        {stat.label}
                      </span>
                    </div>

                    <p className="text-slate-500 text-xs flex items-center gap-1 mb-2">
                      <MapPin size={11} />
                      {job.location}
                    </p>

                    {job.pay && (
                      <p className="text-blue-600 font-bold text-sm mb-2">
                        UGX {job.pay.toLocaleString()}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                      <span className="flex items-center gap-1.5 text-slate-500 text-xs">
                        <Users size={12} />
                        {job.applicants.length} applicant{job.applicants.length !== 1 ? 's' : ''}
                      </span>
                      <span className="text-blue-600 text-xs font-bold flex items-center gap-0.5">
                        View <ChevronRight size={12} />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* FAB — hide on desktop */}
      <Link href="/employer/post-job" className="lg:hidden">
        <div className="fixed bottom-24 right-4 w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-300 active:scale-90 transition-transform">
          <Plus size={26} className="text-white" />
        </div>
      </Link>
    </div>
  );
}
