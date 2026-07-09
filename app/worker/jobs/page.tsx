'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MapPin, Calendar, MessageCircle, Hammer, Trophy, Clock } from 'lucide-react';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { useKola } from '@/lib/store';

type Tab = 'active' | 'completed' | 'pending';

export default function WorkerJobsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('active');
  const { jobs, applications, user } = useKola();

  const appliedJobs = jobs.filter(j => applications.includes(j.id));
  const activeJobs = appliedJobs.filter(j => j.status === 'in_progress');
  const completedJobs = appliedJobs.filter(j => j.status === 'completed');
  const pendingJobs = appliedJobs.filter(j => j.status === 'open');

  const tabJobs = { active: activeJobs, completed: completedJobs, pending: pendingJobs }[activeTab];

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'active', label: 'Active', count: activeJobs.length },
    { key: 'completed', label: 'Completed', count: completedJobs.length },
    { key: 'pending', label: 'Pending', count: pendingJobs.length },
  ];

  return (
    <div className="pb-nav lg:pb-0">
      <MobileHeader title="My Jobs" showNotification />

      {/* Tabs */}
      <div className="bg-white border-b border-slate-100 px-4">
        <div className="flex max-w-4xl lg:mx-auto">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-3.5 text-sm font-semibold relative transition-colors ${
                activeTab === tab.key ? 'text-blue-600' : 'text-slate-500'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.key ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'
                }`}>
                  {tab.count}
                </span>
              )}
              {activeTab === tab.key && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 lg:px-6 py-4 space-y-3 max-w-4xl lg:mx-auto">
        {tabJobs.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#EEF2FF' }}>
              {activeTab === 'active' ? (
                <Hammer size={32} color="#2952E8" strokeWidth={1.5} />
              ) : activeTab === 'completed' ? (
                <Trophy size={32} color="#059669" strokeWidth={1.5} />
              ) : (
                <Clock size={32} color="#8B94B8" strokeWidth={1.5} />
              )}
            </div>
            <p className="text-slate-700 font-semibold text-base">
              {activeTab === 'active' ? 'No active jobs' : activeTab === 'completed' ? 'No completed jobs yet' : 'No pending applications'}
            </p>
            <p className="text-slate-400 text-sm mt-1">
              {activeTab === 'pending'
                ? 'Apply to jobs from the home screen'
                : activeTab === 'active'
                ? 'Your accepted jobs will appear here'
                : 'Completed jobs will show your earnings'}
            </p>
            {activeTab !== 'active' && (
              <Link
                href="/worker"
                className="inline-block mt-5 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold text-sm active:scale-95 transition-transform"
              >
                Browse Jobs
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {tabJobs.map(job => (
              <div key={job.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                {/* Status + urgency row */}
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-bold uppercase tracking-wide ${
                    job.urgency === 'immediate' ? 'text-orange-500' : 'text-blue-500'
                  }`}>
                    {job.urgency}
                  </span>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    activeTab === 'active' ? 'bg-blue-100 text-blue-700' :
                    activeTab === 'completed' ? 'bg-green-100 text-green-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {activeTab === 'active' ? 'IN PROGRESS' : activeTab === 'completed' ? 'DONE' : 'APPLIED'}
                  </span>
                </div>

                <h3 className="text-slate-900 font-bold text-base mb-2">{job.title}</h3>

                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 mb-3">
                  <span className="flex items-center gap-1">
                    <MapPin size={12} />
                    {job.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    {new Date(job.dateTime).toLocaleDateString('en-UG', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                </div>

                {job.pay && (
                  <p className="text-slate-900 font-black text-base mb-3">
                    Earnings: UGX {job.pay.toLocaleString()}
                  </p>
                )}

                <div className="flex gap-2">
                  {activeTab === 'active' && (
                    <>
                      <Link
                        href={`/job/${job.id}`}
                        className="flex-1 text-center py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold active:scale-95 transition-transform"
                      >
                        View Map
                      </Link>
                      <Link
                        href={`/worker/messages`}
                        className="flex items-center gap-1.5 px-4 py-2.5 border-2 border-blue-600 text-blue-600 rounded-xl text-sm font-bold active:scale-95 transition-transform"
                      >
                        <MessageCircle size={14} />
                        Message
                      </Link>
                    </>
                  )}
                  {activeTab === 'completed' && (
                    <Link
                      href={`/completion/${job.id}`}
                      className="flex-1 text-center py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-semibold"
                    >
                      View Details
                    </Link>
                  )}
                  {activeTab === 'pending' && (
                    <Link
                      href={`/job/${job.id}`}
                      className="flex-1 text-center py-2.5 bg-blue-50 text-blue-600 rounded-xl text-sm font-bold active:scale-95 transition-transform"
                    >
                      View Job
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
