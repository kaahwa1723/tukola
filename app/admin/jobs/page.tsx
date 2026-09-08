'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, MapPin, Eye, Trash2, Briefcase } from 'lucide-react';
import { useKola } from '@/lib/store';
import type { Job } from '@/lib/types';

export default function AdminJobsPage() {
  const { jobs: storeJobs } = useKola();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'open' | 'in_progress' | 'completed'>('all');
  const [removed, setRemoved] = useState<Set<string>>(new Set());

  const jobs = storeJobs.filter(j => !removed.has(j.id));

  const handleRemove = async (jobId: string) => {
    if (!confirm('Remove this job from the platform?')) return;
    setRemoved(prev => new Set(Array.from(prev).concat(jobId)));
    await fetch(`/api/jobs/${jobId}`, { method: 'DELETE' }).catch(() => {
      setRemoved(prev => { const next = new Set(prev); next.delete(jobId); return next; });
    });
  };

  const filtered = jobs.filter(j => {
    const matchSearch = j.title.toLowerCase().includes(search.toLowerCase()) ||
      j.location.toLowerCase().includes(search.toLowerCase()) ||
      j.employerName.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || j.status === filter;
    return matchSearch && matchFilter;
  });

  const statusColor: Record<string, string> = {
    open: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-orange-100 text-orange-600',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-600',
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-[#0A0F2C]">Jobs</h1>
        <p className="text-slate-500 text-sm mt-1">{jobs.length} total jobs</p>
      </div>

      {/* Controls */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search jobs..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-sm"
          />
        </div>
        <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm gap-1 overflow-x-auto">
          {(['all', 'open', 'in_progress', 'completed'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                filter === f ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {f === 'all' ? 'All' : f === 'in_progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Jobs table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="text-left px-4 py-3 text-slate-600 font-semibold">Job</th>
              <th className="text-left px-4 py-3 text-slate-600 font-semibold hidden md:table-cell">Employer</th>
              <th className="text-left px-4 py-3 text-slate-600 font-semibold hidden lg:table-cell">Location</th>
              <th className="text-left px-4 py-3 text-slate-600 font-semibold hidden md:table-cell">Applicants</th>
              <th className="text-left px-4 py-3 text-slate-600 font-semibold">Status</th>
              <th className="text-right px-4 py-3 text-slate-600 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map(job => (
              <tr key={job.id} className="table-row-hover transition-colors">
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-900 max-w-[200px] truncate">{job.title}</p>
                  <p className="text-slate-400 text-xs mt-0.5">
                    {new Date(job.dateTime).toLocaleDateString('en-UG', { month: 'short', day: 'numeric' })}
                    {job.pay ? ` • UGX ${job.pay.toLocaleString()}` : ''}
                  </p>
                </td>
                <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{job.employerName}</td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  <span className="flex items-center gap-1 text-slate-600">
                    <MapPin size={12} className="text-slate-400" />
                    {job.location}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600 hidden md:table-cell">
                  {job.applicants.length}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusColor[job.status] || statusColor.open}`}>
                    {job.status.replace('_', ' ').toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/job/${job.id}`}
                      className="text-blue-600 text-xs font-semibold px-2.5 py-1.5 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-1"
                    >
                      <Eye size={13} /> View
                    </Link>
                    <button
                      onClick={() => handleRemove(job.id)}
                      className="text-red-500 text-xs font-semibold px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1">
                      <Trash2 size={13} /> Remove
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <div className="empty-state">
                    <div className="empty-icon"><Briefcase size={30} color="#2952E8" /></div>
                    <p className="empty-title">No jobs found</p>
                    <p className="empty-sub">Jobs posted by employers will appear here.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
