'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MapPin, Star, ChevronLeft, Zap, Gauge, Loader2, ShieldCheck, CheckCircle } from 'lucide-react';
import { useKola } from '@/lib/store';
import { useI18n } from '@/lib/i18n';
import { translateCategory } from '@/lib/i18n';
import { formatUgx, MILESTONE_THRESHOLD_UGX } from '@/lib/pricing';
import VerifiedBadge from '@/components/VerifiedBadge';

interface ServiceDetail {
  id: string;
  title: string;
  category: string;
  unitLabel: string | null;
  priceUgx: number;
  description: string;
  worker: {
    id: string;
    name: string;
    avatar?: string;
    rating?: number;
    completedJobs: number;
    reliabilityScore: number | null;
    location?: string;
    isVerified: boolean;
    skills: string[];
    about: string;
  };
}

/**
 * /employer/book/[serviceId] — one-tap booking of a fundi's
 * priced service listing.
 *
 * The price is ALREADY AGREED (it's the fundi's own listed price),
 * so this page only asks what the listing can't know: where and
 * when. Submitting creates the job pre-filled from the listing and
 * invites the fundi, who accepts with one tap. Held payment and
 * stage releases work exactly like any other job.
 */
export default function BookServicePage() {
  const { serviceId } = useParams<{ serviceId: string }>();
  const { user } = useKola();
  const { t } = useI18n();
  const router = useRouter();

  const [service, setService] = useState<ServiceDetail | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [location, setLocation] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [notes, setNotes] = useState('');
  const [urgency, setUrgency] = useState<'immediate' | 'scheduled'>('scheduled');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successWorker, setSuccessWorker] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/services/${serviceId}`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => { if (data?.service) setService(data.service); })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [serviceId]);

  useEffect(() => {
    if (user?.location && !location) setLocation(user.location);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.location]);

  const handleBook = async () => {
    if (!location.trim()) return;
    if (!user) { router.push('/login'); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/services/${serviceId}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: location.trim(),
          dateTime: dateTime || undefined,
          urgency,
          notes: notes.trim() || undefined,
          clientRequestId: (crypto as any).randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || t('common.networkError'));
        setLoading(false);
        return;
      }
      setSuccessWorker(data.invitedWorkerName ?? service?.worker.name ?? '');
      setTimeout(() => router.push(`/job/${data.job?.id}`), 2200);
    } catch {
      setError(t('common.networkError'));
      setLoading(false);
    }
  };

  if (!loaded) {
    return (
      <div className="mobile-container min-h-screen flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-blue-500" />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="mobile-container min-h-screen flex flex-col items-center justify-center gap-3">
        <p className="text-gray-500 font-semibold">{t('book.notFound')}</p>
        <button onClick={() => router.back()} className="text-[#2952E8] font-bold text-sm">← {t('common.back')}</button>
      </div>
    );
  }

  if (successWorker) {
    return (
      <div className="mobile-container min-h-screen flex flex-col items-center justify-center px-6"
        style={{ background: 'linear-gradient(135deg,#0A0F2C,#2952E8)' }}>
        <div className="text-center">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
            style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
            <CheckCircle size={36} color="#fff" />
          </div>
          <h2 className="text-3xl font-black text-white mb-2">{t('book.sentTitle')}</h2>
          <p className="text-blue-200 mb-1">{t('book.sentSub', { name: successWorker })}</p>
          <p className="text-blue-300/60 text-xs">{t('book.sentHint')}</p>
        </div>
      </div>
    );
  }

  const staged = service.priceUgx >= MILESTONE_THRESHOLD_UGX;
  const fieldStyle = { border: '1.5px solid #E2E6F0' };

  return (
    <div className="mobile-container min-h-screen bg-[#F7F9FF]">
      <header className="sticky top-0 z-40 h-14 px-4 flex items-center gap-3"
        style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(41,82,232,0.07)' }}>
        <button onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-xl active:bg-gray-100 transition-colors">
          <ChevronLeft size={22} color="#2952E8" strokeWidth={2.5} />
        </button>
        <span className="font-black text-base text-[#0A0F2C]">{t('book.title')}</span>
      </header>

      <div className="px-4 py-4 space-y-4 pb-32">

        {/* Service + price card */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg,#2952E8,#1A2DB8)' }}>
          <div className="p-5">
            <p className="text-blue-200 text-[11px] font-bold uppercase tracking-wide mb-1">{translateCategory(service.category, t)}</p>
            <h2 className="text-white font-black text-lg leading-tight">{service.title}</h2>
            {service.description && (
              <p className="text-blue-100/80 text-xs leading-relaxed mt-2">{service.description}</p>
            )}
            <div className="mt-3 flex items-end gap-2">
              <p className="text-white font-black text-2xl">{formatUgx(service.priceUgx)}</p>
              {service.unitLabel && <p className="text-blue-200 text-xs font-semibold mb-1">{service.unitLabel}</p>}
            </div>
            <p className="text-blue-200/70 text-[11px] mt-1">{t('book.priceNote')}</p>
            {staged && (
              <p className="mt-2 text-[11px] font-bold text-white bg-white/15 rounded-lg px-2.5 py-1.5 inline-block">
                {t('book.stagedNote')}
              </p>
            )}
          </div>

          {/* Fundi strip */}
          <div className="px-5 pb-4 flex items-center gap-3 border-t border-white/15 pt-3">
            {service.worker.avatar ? (
              <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={service.worker.avatar} alt={service.worker.name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-white/20">
                <span className="text-white font-black">{service.worker.name.charAt(0)}</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-white font-bold text-sm truncate">{service.worker.name}</p>
                {service.worker.isVerified && <ShieldCheck size={12} color="#7DD3FC" strokeWidth={2.5} />}
              </div>
              <div className="flex items-center gap-2 text-white/70 text-[11px]">
                <span className="flex items-center gap-0.5">
                  <Star size={10} fill="white" color="white" />
                  {service.worker.rating != null ? service.worker.rating.toFixed(1) : t('common.new')}
                </span>
                <span className="flex items-center gap-0.5">
                  <Zap size={9} /> {service.worker.completedJobs} {t('book.jobsDone')}
                </span>
                <span className="flex items-center gap-0.5">
                  <Gauge size={9} /> {service.worker.reliabilityScore != null ? service.worker.reliabilityScore : t('common.new')}
                </span>
              </div>
            </div>
            {service.worker.isVerified && <VerifiedBadge variant="chip" dark />}
          </div>
        </div>

        {/* Where & when */}
        <div className="bg-white rounded-2xl p-4 space-y-4"
          style={{ border: '1px solid #E8EDF8', boxShadow: '0 2px 16px rgba(41,82,232,0.06)' }}>
          <div>
            <h3 className="font-black text-[#0A0F2C] text-base mb-0.5">{t('book.detailsTitle')}</h3>
            <p className="text-gray-400 text-xs">{t('book.detailsSub', { name: service.worker.name.split(' ')[0] })}</p>
          </div>

          <div>
            <label className="text-[#0A0F2C] font-semibold text-sm mb-1.5 block">{t('book.location')} *</label>
            <div className="relative">
              <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={location} onChange={e => setLocation(e.target.value)}
                placeholder={t('book.locationPh')}
                className="w-full rounded-xl pl-10 pr-4 py-3 text-sm text-[#0A0F2C] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                style={fieldStyle} />
            </div>
          </div>

          <div>
            <label className="text-[#0A0F2C] font-semibold text-sm mb-1.5 block">{t('book.when')}</label>
            <input type="datetime-local" value={dateTime} onChange={e => setDateTime(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm text-[#0A0F2C] focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              style={fieldStyle} />
          </div>

          <div>
            <label className="text-[#0A0F2C] font-semibold text-sm mb-1.5 block">{t('book.notes')}</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              placeholder={t('book.notesPh')}
              className="w-full rounded-xl px-4 py-3 text-sm text-[#0A0F2C] placeholder-gray-400 focus:outline-none resize-none focus:ring-2 focus:ring-blue-500/30"
              style={fieldStyle} />
          </div>

          <div>
            <label className="text-[#0A0F2C] font-semibold text-sm mb-2 block">{t('book.urgency')}</label>
            <div className="flex gap-3">
              {[
                { v: 'scheduled', label: t('job.scheduled'), color: '#2952E8' },
                { v: 'immediate', label: t('job.immediate'), color: '#DC2626' },
              ].map(u => (
                <button key={u.v} onClick={() => setUrgency(u.v as 'immediate' | 'scheduled')}
                  className="flex-1 py-3 rounded-xl text-sm font-black border-2 transition-all"
                  style={{
                    borderColor: urgency === u.v ? u.color : '#E2E6F0',
                    background: urgency === u.v ? u.color : '#fff',
                    color: urgency === u.v ? '#fff' : '#4A5580',
                  }}>
                  {u.label}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-red-600 text-xs font-semibold">{error}</p>}
        </div>
      </div>

      {/* Fixed bottom CTA — the price is already agreed */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-4 py-4"
        style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(16px)', borderTop: '1px solid rgba(41,82,232,0.08)' }}>
        <button onClick={handleBook} disabled={!location.trim() || loading}
          className="w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 active:scale-95 transition-all"
          style={{
            background: location.trim() ? 'linear-gradient(135deg,#2952E8,#1A2DB8)' : '#E2E6F0',
            color: location.trim() ? '#fff' : '#9BA3C0',
            boxShadow: location.trim() ? '0 6px 20px rgba(41,82,232,0.35)' : 'none',
          }}>
          {loading
            ? <><Loader2 size={18} className="animate-spin" /> {t('book.sending')}</>
            : t('book.cta', { price: formatUgx(service.priceUgx) })}
        </button>
      </div>
    </div>
  );
}
