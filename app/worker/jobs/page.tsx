'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MapPin, Calendar, MessageCircle, Briefcase, Search } from 'lucide-react';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { useKola } from '@/lib/store';
import { useI18n } from '@/lib/i18n';

type Tab = 'active' | 'completed' | 'pending';

export default function WorkerJobsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('active');
  const { jobs, applications, user } = useKola();
  const { t } = useI18n();

  const appliedJobs = jobs.filter(j => applications.includes(j.id));
  const activeJobs = appliedJobs.filter(j => j.status === 'in_progress');
  const completedJobs = appliedJobs.filter(j => j.status === 'completed');
  const pendingJobs = appliedJobs.filter(j => j.status === 'open');

  const tabJobs = { active: activeJobs, completed: completedJobs, pending: pendingJobs }[activeTab];

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'active', label: t('wj.active'), count: activeJobs.length },
    { key: 'completed', label: t('wj.completed'), count: completedJobs.length },
    { key: 'pending', label: t('wj.pending'), count: pendingJobs.length },
  ];

  const emptyTitle =
    activeTab === 'active' ? t('wj.noActive')
    : activeTab === 'completed' ? t('wj.noCompleted')
    : t('wj.noPending');
  const emptySub =
    activeTab === 'active' ? t('wj.noActiveSub')
    : activeTab === 'completed' ? t('wj.noCompletedSub')
    : t('wj.noPendingSub');
  const statusBadge =
    activeTab === 'active' ? t('wj.inProgress')
    : activeTab === 'completed' ? t('wj.done')
    : t('wj.appliedBadge');

  return (
    <div className="pb-nav lg:pb-0">
      <MobileHeader title={t('worker.myJobs')} showNotification />

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
          <div className="empty-state">
            <div className="empty-icon">
              <Briefcase size={30} color="#2952E8" />
            </div>
            <p className="empty-title">{emptyTitle}</p>
            <p className="empty-sub">{emptySub}</p>
            <Link
              href="/worker"
              className="btn-gradient mt-5 px-6 py-3 rounded-xl text-sm inline-flex items-center gap-2"
            >
              <Search size={16} />
              {t('wj.browseJobs')}
            </Link>
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
                    {job.urgency === 'immediate' ? t('job.urgent') : t('job.scheduled')}
                  </span>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    activeTab === 'active' ? 'bg-blue-100 text-blue-700' :
                    activeTab === 'completed' ? 'bg-green-100 text-green-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {statusBadge}
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
                    {t('wj.earnings', { amount: job.pay.toLocaleString() })}
                  </p>
                )}

                <div className="flex gap-2">
                  {activeTab === 'active' && (
                    <>
                      <Link
                        href={`/job/${job.id}`}
                        className="flex-1 text-center py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold active:scale-95 transition-transform"
                      >
                        {t('wj.viewMap')}
                      </Link>
                      <Link
                        href={`/worker/messages`}
                        className="flex items-center gap-1.5 px-4 py-2.5 border-2 border-blue-600 text-blue-600 rounded-xl text-sm font-bold active:scale-95 transition-transform"
                      >
                        <MessageCircle size={14} />
                        {t('wj.message')}
                      </Link>
                    </>
                  )}
                  {activeTab === 'completed' && (
                    <Link
                      href={`/completion/${job.id}`}
                      className="flex-1 text-center py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-semibold"
                    >
                      {t('wj.viewDetails')}
                    </Link>
                  )}
                  {activeTab === 'pending' && (
                    <Link
                      href={`/job/${job.id}`}
                      className="flex-1 text-center py-2.5 bg-blue-50 text-blue-600 rounded-xl text-sm font-bold active:scale-95 transition-transform"
                    >
                      {t('wj.viewJob')}
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
