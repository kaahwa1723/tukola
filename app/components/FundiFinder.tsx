'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Search, MapPin, Star, ShieldCheck, Navigation, Loader2, Award } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

interface Fundi {
  id: string;
  name: string;
  avatar?: string;
  rating?: number;
  completedJobs: number;
  reliabilityScore?: number; // undefined = no history → show "New"
  skills: string[];
  location?: string;
  isVerified: boolean;
  topRated: boolean;
}

/**
 * FundiFinder — location-first worker search for employers (plan 1.2).
 *
 * Two ways to set the area:
 *   1. Type a parish/area ("Kololo", "Ntinda", "Kira"…)
 *   2. "Near me" — browser geolocation reverse-geocoded to a parish name
 *      via OpenStreetMap Nominatim (no precise GPS is ever stored; only
 *      the parish name is used for matching)
 *
 * The first 3 results carry a merit-based "Top Rated" badge — ranking is
 * rating + completed jobs, never paid placement.
 */
export default function FundiFinder() {
  const { t } = useI18n();
  const [area, setArea] = useState('');
  const [activeArea, setActiveArea] = useState('');
  const [fundis, setFundis] = useState<Fundi[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  const search = useCallback(async (areaQuery: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (areaQuery) params.set('area', areaQuery);
      const res = await fetch(`/api/fundis?${params.toString()}`);
      const data = await res.json();
      setFundis(res.ok ? data.fundis : []);
    } catch {
      setFundis([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { search(''); }, [search]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveArea(area.trim());
    search(area.trim());
  };

  const nearMe = () => {
    if (!navigator.geolocation) {
      setLocateError(t('ff.locBrowser'));
      return;
    }
    setLocating(true);
    setLocateError(null);
    navigator.geolocation.getCurrentPosition(
      async pos => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`
          );
          const data = await res.json();
          const a = data?.address ?? {};
          const parish = a.suburb || a.neighbourhood || a.village || a.town || a.city_district || a.city || a.county || '';
          if (!parish) {
            setLocateError(t('ff.locNoName'));
            return;
          }
          setArea(parish);
          setActiveArea(parish);
          await search(parish);
        } catch {
          setLocateError(t('ff.locFailed'));
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocateError(t('ff.locDenied'));
        setLocating(false);
      },
      { timeout: 10000 }
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-slate-900 font-black text-base">{t('employer.findFundis')}</h2>
      </div>

      {/* Search bar */}
      <form onSubmit={submitSearch} className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={area}
            onChange={e => setArea(e.target.value)}
            placeholder={t('employer.areaPlaceholder')}
            className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
          />
        </div>
        <button type="submit"
          className="px-5 py-3 rounded-2xl text-white text-sm font-black active:scale-95 transition-transform"
          style={{ background: 'linear-gradient(135deg,#2952E8,#1A2DB8)' }}>
          {t('common.search')}
        </button>
        <button type="button" onClick={nearMe} disabled={locating}
          aria-label={t('ff.useMyLocation')}
          className="px-4 py-3 rounded-2xl bg-blue-50 text-blue-600 text-sm font-bold active:scale-95 transition-transform flex items-center gap-1.5 disabled:opacity-60">
          {locating ? <Loader2 size={16} className="animate-spin" /> : <Navigation size={16} />}
          <span className="hidden sm:inline">{t('employer.nearMe')}</span>
        </button>
      </form>

      {locateError && (
        <p className="text-amber-600 text-xs font-semibold mb-3">{locateError}</p>
      )}
      {activeArea && (
        <p className="text-slate-500 text-xs font-semibold mb-3 flex items-center gap-1">
          <MapPin size={12} /> {t('ff.showingNear', { area: activeArea })}
        </p>
      )}

      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 size={24} className="animate-spin text-blue-500" />
        </div>
      ) : !fundis || fundis.length === 0 ? (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm text-center">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mx-auto mb-3">
            <MapPin size={24} color="#2952E8" />
          </div>
          <p className="text-slate-600 font-semibold text-sm">
            {activeArea ? t('ff.noneInArea', { area: activeArea }) : t('ff.noneYet')}
          </p>
          <p className="text-slate-400 text-xs mt-1">
            {t('ff.postInstead')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {fundis.map(fundi => (
            <div key={fundi.id}
              className="rounded-2xl p-3.5 bg-white border border-blue-100/40 hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(41,82,232,0.16)] transition-all duration-200 relative">
              {fundi.topRated && (
                <span className="absolute top-2 right-2 flex items-center gap-1 bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-0.5 rounded-full">
                  <Award size={10} /> {t('employer.topRated')}
                </span>
              )}
              {fundi.avatar ? (
                <div className="w-14 h-14 rounded-2xl overflow-hidden mx-auto mb-2.5" style={{ border: '1.5px solid rgba(41,82,232,0.12)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={fundi.avatar} alt={fundi.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-2.5"
                  style={{ background: 'linear-gradient(135deg,#2952E8,#1A2DB8)' }}>
                  <span className="text-white font-black text-xl">{fundi.name.charAt(0)}</span>
                </div>
              )}
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <p className="text-[#0A0F2C] font-bold text-sm text-center leading-tight truncate">{fundi.name.split(' ')[0]}</p>
                {fundi.isVerified && (
                  <span title="ID-verified: National ID + 2 reference calls, checked by our team">
                    <ShieldCheck size={11} color="#2952E8" strokeWidth={2} />
                  </span>
                )}
              </div>
              <p className="text-[#8B94B8] text-[11px] text-center mb-1 truncate">{fundi.skills?.[0] ?? 'Fundi'}</p>
              {fundi.location && (
                <p className="text-[#8B94B8] text-[10px] text-center mb-1.5 flex items-center justify-center gap-0.5 truncate">
                  <MapPin size={9} /> {fundi.location}
                </p>
              )}
              <div className="flex items-center justify-center gap-1 mb-1.5">
                <Star size={11} className="text-yellow-500 fill-yellow-500" />
                <span className="text-[#0A0F2C] text-xs font-bold">
                  {fundi.rating != null ? fundi.rating.toFixed(1) : t('common.new')}
                </span>
                <span className="text-[#8B94B8] text-[10px]">{t('job.jobsCount', { n: fundi.completedJobs })}</span>
              </div>
              <p className={`text-[10px] font-bold text-center mb-3 ${
                fundi.reliabilityScore == null ? 'text-[#8B94B8]'
                : fundi.reliabilityScore >= 80 ? 'text-emerald-600'
                : fundi.reliabilityScore >= 50 ? 'text-amber-600'
                : 'text-red-500'
              }`}>
                {t('ff.reliability', { score: fundi.reliabilityScore != null ? fundi.reliabilityScore : t('common.new') })}
              </p>
              <Link href={`/employer/hire/${fundi.id}`}>
                <button className="w-full py-1.5 rounded-xl text-xs font-black active:scale-95 transition-transform text-white"
                  style={{ background: 'linear-gradient(135deg,#2952E8,#1A2DB8)' }}>
                  {t('employer.hire')}
                </button>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
