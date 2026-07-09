'use client';

import { useKola } from '@/lib/store';
import { MOCK_WORKERS, MOCK_EMPLOYERS } from '@/lib/data';
import { TrendingUp, Users, Briefcase, DollarSign, MapPin, Star, Zap, Calendar } from 'lucide-react';

export default function AdminAnalyticsPage() {
  const { jobs } = useKola();

  const totalUsers = MOCK_WORKERS.length + MOCK_EMPLOYERS.length;
  const totalJobs = jobs.length;
  const completedJobs = jobs.filter(j => j.status === 'completed').length;
  const totalPay = jobs.filter(j => j.pay).reduce((sum, j) => sum + (j.pay || 0), 0);
  const avgPay = jobs.filter(j => j.pay).length ? Math.round(totalPay / jobs.filter(j => j.pay).length) : 0;

  const completionRate = totalJobs ? Math.round((completedJobs / totalJobs) * 100) : 0;
  const avgRating = MOCK_WORKERS.reduce((sum, w) => sum + (w.rating ?? 0), 0) / MOCK_WORKERS.length;

  const jobsByCategory = jobs.reduce((acc: Record<string, number>, j) => {
    const cat = j.skills?.[0] || 'General';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const topCategories = Object.entries(jobsByCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const jobsByUrgency = {
    immediate: jobs.filter(j => j.urgency === 'immediate').length,
    scheduled: jobs.filter(j => j.urgency === 'scheduled').length,
  };

  const locationCounts = jobs.reduce((acc: Record<string, number>, j) => {
    const loc = j.location.split(',')[0].trim();
    acc[loc] = (acc[loc] || 0) + 1;
    return acc;
  }, {});

  const topLocations = Object.entries(locationCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
          <TrendingUp size={20} className="text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-[#0A0F2C]">Analytics</h1>
          <p className="text-slate-500 text-sm">Platform performance overview</p>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Users', value: totalUsers, Icon: Users, color: 'blue', change: '+12%' },
          { label: 'Jobs Posted', value: totalJobs, Icon: Briefcase, color: 'orange', change: '+8%' },
          { label: 'Completion Rate', value: `${completionRate}%`, Icon: TrendingUp, color: 'green', change: '+5%' },
          { label: 'Avg Pay (UGX)', value: avgPay.toLocaleString(), Icon: DollarSign, color: 'purple', change: '+3%' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${
              kpi.color === 'blue' ? 'bg-blue-100 text-blue-600' :
              kpi.color === 'orange' ? 'bg-orange-100 text-orange-600' :
              kpi.color === 'green' ? 'bg-green-100 text-green-600' :
              'bg-purple-100 text-purple-600'
            }`}>
              <kpi.Icon size={16} />
            </div>
            <p className="text-2xl font-black text-slate-900">{kpi.value}</p>
            <p className="text-slate-600 font-semibold text-xs mt-0.5">{kpi.label}</p>
            <p className="text-green-600 text-xs font-semibold mt-1">{kpi.change} this month</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Job categories */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="font-black text-slate-900 mb-4">Top Categories</h2>
          <div className="space-y-3">
            {topCategories.map(([cat, count]) => (
              <div key={cat}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-slate-700 text-sm font-semibold">{cat}</span>
                  <span className="text-slate-500 text-sm">{count}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${Math.round((count / totalJobs) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Job urgency breakdown */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="font-black text-slate-900 mb-4">Job Types</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <Zap size={22} className="text-orange-500" />
              </div>
              <div>
                <p className="font-bold text-[#0A0F2C] text-lg">{jobsByUrgency.immediate}</p>
                <p className="text-slate-500 text-xs">Immediate jobs</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#EEF2FF' }}>
                <Calendar size={20} color="#2952E8" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-lg">{jobsByUrgency.scheduled}</p>
                <p className="text-slate-500 text-xs">Scheduled jobs</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <Star size={20} className="text-yellow-500" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-lg">{avgRating.toFixed(1)}</p>
                <p className="text-slate-500 text-xs">Avg worker rating</p>
              </div>
            </div>
          </div>
        </div>

        {/* Top locations */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="font-black text-slate-900 mb-4">Top Locations</h2>
          <div className="space-y-3">
            {topLocations.map(([loc, count], i) => (
              <div key={loc} className="flex items-center gap-3">
                <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin size={13} className="text-blue-500" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-slate-700 text-sm font-semibold truncate">{loc}</span>
                    <span className="text-slate-400 text-xs ml-2 flex-shrink-0">{count} jobs</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-400 rounded-full"
                      style={{ width: `${Math.round((count / (topLocations[0]?.[1] || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
