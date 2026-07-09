'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, MapPin, Users, ChevronRight, Briefcase } from 'lucide-react';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { useKola } from '@/lib/store';

export default function EmployerJobsPage() {
  const { jobs, user } = useKola();
  const [filter, setFilter] = useState<'all' | 'open' | 'in_progress' | 'completed'>('all');

  const myJobs = jobs.filter(j => j.employerId === user?.id || ['e1', 'e2'].includes(j.employerId));
  const filtered = filter === 'all' ? myJobs : myJobs.filter(j => j.status === filter);

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
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-3">
              <Briefcase size={28} color="#2952E8" />
            </div>
            <p className="text-slate-600 font-semibold">No {filter !== 'all' ? filter.replace('_', ' ') : ''} jobs</p>
            <Link
              href="/employer/post-job"
              className="inline-flex items-center gap-2 mt-4 bg-blue-600 text-white px-5 py-3 rounded-xl font-bold text-sm active:scale-95 transition-transform"
            >
              <Plus size={16} /> Post a Job
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
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
