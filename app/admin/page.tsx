'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useKola } from '@/lib/store';
import { Users, Briefcase, CheckCircle, TrendingUp, AlertTriangle, Star, RefreshCw, Info } from 'lucide-react';

interface Stats {
  totalUsers: number; totalWorkers: number; totalEmployers: number;
  totalJobs: number; openJobs: number; activeJobs: number; completedJobs: number;
}

export default function AdminDashboard() {
  const { jobs, refreshJobs } = useKola();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    await refreshJobs();
    const [statsFetch, workersFetch] = await Promise.all([
      fetch('/api/admin/stats').catch(() => null),
      fetch('/api/admin/users?role=worker').catch(() => null),
    ]);
    if (statsFetch?.status === 401 || workersFetch?.status === 401) {
      router.push('/admin/login');
      return;
    }
    const statsRes = statsFetch ? await statsFetch.json().catch(() => null) : null;
    const workersRes = workersFetch ? await workersFetch.json().catch(() => null) : null;
    if (statsRes && !statsRes.error) setStats(statsRes);
    if (workersRes?.users) setWorkers(workersRes.users);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const completionRate = stats && stats.totalJobs
    ? Math.round((stats.completedJobs / stats.totalJobs) * 100)
    : 0;

  const kpis = [
    {
      label: 'Total Users', value: stats?.totalUsers ?? '—',
      Icon: Users, color: '#2952E8', bg: '#EEF2FF',
      sub: stats ? `${stats.totalWorkers} workers · ${stats.totalEmployers} employers` : null,
    },
    {
      label: 'Total Jobs', value: stats?.totalJobs ?? '—',
      Icon: Briefcase, color: '#D97706', bg: '#FFF7ED',
      sub: stats ? `${stats.openJobs} open · ${stats.activeJobs} active` : null,
    },
    {
      label: 'Completed', value: stats?.completedJobs ?? '—',
      Icon: CheckCircle, color: '#16A34A', bg: '#F0FDF4',
      sub: 'All time',
    },
    {
      label: 'Completion Rate', value: `${completionRate}%`,
      Icon: TrendingUp, color: '#7C3AED', bg: '#F5F3FF',
      sub: 'Overall success',
    },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between animate-slide-up">
        <div>
          <h1 className="text-2xl font-black text-[#0A0F2C]">Overview</h1>
          <p className="text-slate-500 text-sm mt-0.5">How TUKOLA is doing right now — live numbers</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-xl transition-colors disabled:opacity-60"
          style={{ background: '#EEF2FF', color: '#2952E8' }}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          Refresh
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-slide-up-d1">
        {kpis.map(kpi => (
          <div key={kpi.label} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-[0_10px_36px_rgba(41,82,232,0.14)] hover:-translate-y-0.5 transition-all duration-200">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3"
              style={{ background: kpi.bg }}>
              <kpi.Icon size={18} color={kpi.color} />
            </div>
            <p className="text-2xl font-black text-[#0A0F2C] counter-number">{kpi.value}</p>
            <p className="text-[#0A0F2C] font-semibold text-sm mt-0.5">{kpi.label}</p>
            {kpi.sub && <p className="text-slate-400 text-xs mt-0.5">{kpi.sub}</p>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Jobs */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 animate-slide-up-d2">
          <h2 className="font-black text-[#0A0F2C] mb-4">Recent Jobs</h2>
          {jobs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><Briefcase size={30} color="#2952E8" /></div>
              <p className="empty-title">No jobs yet</p>
              <p className="empty-sub">Recently posted jobs will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.slice(0, 6).map(job => (
                <div key={job.id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                    job.status === 'open' ? 'bg-[#2952E8]' :
                    job.status === 'in_progress' ? 'bg-orange-500' :
                    job.status === 'completed' ? 'bg-green-500' : 'bg-slate-300'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#0A0F2C] text-sm truncate">{job.title}</p>
                    <p className="text-slate-400 text-xs">{job.location} · {job.employerName}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0 ${
                    job.status === 'open'        ? 'bg-blue-100 text-blue-700' :
                    job.status === 'in_progress' ? 'bg-orange-100 text-orange-600' :
                    job.status === 'completed'   ? 'bg-green-100 text-green-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {job.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Workers */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 animate-slide-up-d3">
          <h2 className="font-black text-[#0A0F2C] mb-4">Top Workers</h2>
          {workers.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><Users size={30} color="#2952E8" /></div>
              <p className="empty-title">No workers yet</p>
              <p className="empty-sub">Top-rated workers will appear here once jobs are completed.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {workers.slice(0, 5).map((worker: any) => (
                <div key={worker.id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg,#2952E8,#1A2DB8)' }}>
                    <span className="text-white font-bold text-sm">{worker.name.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#0A0F2C] text-sm">{worker.name}</p>
                    <p className="text-slate-400 text-xs">{worker.skills?.slice(0, 2).join(', ') || 'No skills listed'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm flex items-center gap-1 justify-end" style={{ color: '#0A0F2C' }}>
                      <Star size={11} className="text-yellow-500 fill-yellow-500" />
                      {worker.rating != null ? worker.rating : 'No ratings yet'}
                    </p>
                    <p className="text-slate-400 text-xs">{worker.completedJobs ?? 0} jobs done</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Platform Alerts */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 lg:col-span-2 animate-slide-up-d3">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-orange-100 rounded-xl flex items-center justify-center">
              <AlertTriangle size={16} className="text-orange-500" />
            </div>
            <h2 className="font-black text-[#0A0F2C]">Things to Check</h2>
          </div>
          <div className="space-y-2">
            {[
              { msg: `${stats ? stats.totalWorkers : '—'} fundis registered — open Users to check who still needs ID verification`, type: 'info' },
              { msg: 'Open the Disputes tab to decide any frozen payments waiting on you', type: 'warning' },
              { msg: 'Open Analytics for this week\'s numbers before your Monday review', type: 'success' },
            ].map((alert, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ${
                alert.type === 'warning' ? 'bg-orange-50 border border-orange-100' :
                alert.type === 'success' ? 'bg-green-50 border border-green-100' :
                'bg-blue-50 border border-blue-100'
              }`}>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  alert.type === 'warning' ? 'bg-orange-100' :
                  alert.type === 'success' ? 'bg-green-100' : 'bg-blue-100'
                }`}>
                  {alert.type === 'warning' ? <AlertTriangle size={13} className="text-orange-500" /> :
                   alert.type === 'success' ? <CheckCircle size={13} className="text-green-600" /> :
                   <Info size={13} className="text-blue-600" />}
                </div>
                <p className="text-slate-700 text-sm">{alert.msg}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
