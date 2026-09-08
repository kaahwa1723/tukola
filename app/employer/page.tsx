'use client';

import Link from 'next/link';
import { Plus, Bell, ChevronRight, MapPin, Star, Users, Lightbulb, ShieldCheck, TrendingUp, Briefcase, Wrench } from 'lucide-react';
import { useKola } from '@/lib/store';
import { MOCK_WORKERS } from '@/lib/data';
import { useI18n } from '@/lib/i18n';
import FundiFinder from '@/app/components/FundiFinder';
import InviteEarn from '@/app/components/InviteEarn';

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

function WorkerCard({ worker }: { worker: (typeof MOCK_WORKERS)[0] }) {
  const { t } = useI18n();
  return (
    <div className="flex-shrink-0 w-36 lg:w-40 rounded-2xl p-3.5 bg-white border border-blue-100/40 hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(41,82,232,0.16)] transition-all duration-200 active:scale-[0.98]">
      {worker.avatar ? (
        <div className="w-14 h-14 rounded-2xl overflow-hidden mx-auto mb-2.5" style={{ border: '1.5px solid rgba(41,82,232,0.12)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={worker.avatar} alt={worker.name} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-2.5"
          style={{ background: 'linear-gradient(135deg,#2952E8,#1A2DB8)' }}>
          <span className="text-white font-black text-xl">{worker.name.charAt(0)}</span>
        </div>
      )}
      <div className="flex items-center justify-center gap-1 mb-0.5">
        <p className="text-[#0A0F2C] font-bold text-sm text-center leading-tight truncate">{worker.name.split(' ')[0]}</p>
        {worker.isVerified && (
          <span title="ID-verified: National ID + 2 reference calls, checked by our team">
            <ShieldCheck size={11} color="#2952E8" strokeWidth={2} />
          </span>
        )}
      </div>
      <p className="text-[#8B94B8] text-[11px] text-center mb-2">{worker.skills?.[0]}</p>
      <div className="flex items-center justify-center gap-1 mb-3">
        <Star size={11} className="text-yellow-500 fill-yellow-500" />
        <span className="text-[#0A0F2C] text-xs font-bold">{worker.rating}</span>
        <span className="text-[#8B94B8] text-[10px]">({worker.completedJobs})</span>
      </div>
      <Link href={`/employer/hire/${worker.id}`}>
        <button className="w-full py-1.5 rounded-xl text-xs font-black active:scale-95 transition-transform text-white"
          style={{ background: 'linear-gradient(135deg,#2952E8,#1A2DB8)' }}>
          {t('employer.hire')}
        </button>
      </Link>
    </div>
  );
}

export default function EmployerHomePage() {
  const { user, jobs } = useKola();
  const { t } = useI18n();
  const firstName = user?.name?.split(' ')[0] || 'there';

  const myJobs = jobs.filter(j => j.employerId === user?.id);
  const activeJobs = myJobs.filter(j => j.status === 'in_progress');
  const pendingJobs = myJobs.filter(j => j.status === 'open');
  const recentJobs = myJobs.slice(0, 3);

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Welcome card */}
      <div className="rounded-2xl lg:rounded-3xl p-5 lg:p-8 relative overflow-hidden header-mesh animate-slide-up"
        style={{ background: 'linear-gradient(135deg,#00C8FF 0%,#2952E8 55%,#1A2DB8 100%)' }}>
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <p className="text-white/60 text-sm font-semibold">{t('ed.hello', { name: firstName })}</p>
              <h1 className="text-2xl lg:text-3xl font-black text-white mt-0.5">{t('ed.manageJobs')}</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full"
                style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                {t('ed.activeCount', { n: activeJobs.length + pendingJobs.length })}
              </span>
              {pendingJobs.length > 0 && (
                <span className="text-xs font-bold px-3 py-1.5 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.85)' }}>
                  {t('ed.pendingCount', { n: pendingJobs.length })}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Post job CTA */}
      <Link href="/employer/post-job" className="block animate-slide-up-d1">
        <button className="w-full text-white rounded-2xl py-4 text-base font-black flex items-center justify-center gap-2.5 active:scale-95 transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg,#2952E8,#1A2DB8)', boxShadow: '0 6px 20px rgba(41,82,232,0.35)' }}>
          <div className="w-6 h-6 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
            <Plus size={16} />
          </div>
          {t('employer.postJob')}
        </button>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Recent jobs */}
        <div className="lg:col-span-2 space-y-6 min-w-0 animate-slide-up-d2">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-slate-900 font-black text-base">{t('ed.recentPosts')}</h2>
              <Link href="/employer/jobs" className="text-blue-600 text-sm font-semibold hover:text-blue-700">
                {t('ed.viewAll')}
              </Link>
            </div>

            {recentJobs.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm text-center">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mx-auto mb-3">
                  <Briefcase size={24} color="#2952E8" />
                </div>
                <p className="text-slate-600 font-semibold text-sm">{t('ed.noJobs')}</p>
                <p className="text-slate-400 text-xs mt-1">{t('ed.noJobsSub')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recentJobs.map(job => (
                  <Link href={`/job/${job.id}`} key={job.id}>
                    <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 hover:shadow-md transition-all">
                      {job.images && job.images.length > 0 && (
                        <div className="relative h-28 w-full overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={job.images[0]} alt={job.title} className="w-full h-full object-cover" />
                          <div className="absolute bottom-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/90 text-[#0A0F2C] shadow-sm">
                            {t('common.photosCount', { n: job.images.length })}
                          </div>
                        </div>
                      )}
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Wrench size={20} color="#2952E8" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <h3 className="font-bold text-slate-900 text-sm flex-1 truncate">{job.title}</h3>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                                job.urgency === 'immediate'
                                  ? 'bg-orange-100 text-orange-600'
                                  : 'bg-blue-100 text-blue-600'
                              }`}>
                                {job.urgency === 'immediate' ? t('job.immediate') : t('job.scheduled')}
                              </span>
                            </div>
                            <p className="text-slate-500 text-xs flex items-center gap-1">
                              <MapPin size={10} />
                              {job.location} •{' '}
                              {new Date(job.dateTime).toLocaleDateString('en-UG', { weekday: 'short', month: 'short', day: 'numeric' })}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between">
                          {job.status === 'in_progress' && job.applicants.find(a => a.status === 'accepted') ? (
                            <>
                              <p className="text-slate-600 text-xs">
                                <span className="font-semibold">{t('ed.workerLabel')}</span>{' '}
                                {job.applicants.find(a => a.status === 'accepted')?.workerName}
                              </p>
                              <span className="text-blue-600 text-xs font-bold flex items-center gap-0.5">
                                {t('ed.track')} <ChevronRight size={12} />
                              </span>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center gap-1.5">
                                <Users size={13} className="text-slate-400" />
                                <span className="text-slate-600 text-xs font-semibold">
                                  {t('ed.applicants', { n: job.applicants.length })}
                                </span>
                              </div>
                              <span className="text-blue-600 text-xs font-bold flex items-center gap-0.5">
                                {t('ed.review')} <ChevronRight size={12} />
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Fundi finder + tips */}
        <div className="space-y-6 min-w-0 animate-slide-up-d3">
          {/* Real fundi search — location-first, merit-ranked */}
          <FundiFinder />

          {/* Suggested workers — demo mode only */}
          {DEMO_MODE && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-slate-900 font-black text-base">{t('ed.suggested')}</h2>
                <Link href="/employer/jobs" className="text-sm font-semibold text-blue-600 hover:text-blue-700">{t('ed.viewAll')}</Link>
              </div>
              <div className="flex lg:flex-col gap-3 overflow-x-auto lg:overflow-visible scrollbar-hide pt-1 pb-2">
                {MOCK_WORKERS.slice(0, 4).map(worker => (
                  <WorkerCard key={worker.id} worker={worker} />
                ))}
              </div>
            </div>
          )}

          {/* Invite & earn — referral credit block (Phase 2) */}
          <InviteEarn />

          {/* Tip */}
          <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100 flex items-start gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Lightbulb size={18} className="text-white" />
            </div>
            <div>
              <p className="text-blue-900 font-bold text-sm">{t('ed.tipTitle')}</p>
              <p className="text-blue-700 text-xs mt-0.5 leading-relaxed">
                {t('ed.tipBody')}
              </p>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl p-4 border border-slate-100 text-center">
              <p className="text-2xl font-black text-blue-600">{myJobs.length}</p>
              <p className="text-slate-500 text-xs font-medium mt-1">{t('ed.totalJobs')}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-100 text-center">
              <p className="text-2xl font-black text-green-600">{activeJobs.length}</p>
              <p className="text-slate-500 text-xs font-medium mt-1">{t('ed.activeLabel')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
