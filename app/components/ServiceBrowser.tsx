'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Search, MapPin, Star, ShieldCheck, Loader2, Award, Tag } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { JOB_CATEGORIES } from '@/lib/constants';
import { formatUgx } from '@/lib/pricing';
import { translateCategory } from '@/lib/i18n';

interface ServiceListing {
  id: string;
  title: string;
  category: string;
  unitLabel: string | null;
  priceUgx: number;
  description: string;
  topRated?: boolean;
  worker: {
    id: string;
    name: string;
    avatar?: string;
    rating?: number;
    completedJobs: number;
    location?: string;
    isVerified: boolean;
  };
}

/**
 * ServiceBrowser — employer marketplace of fundi-posted priced
 * services (the Fiverr-style half of Tukola).
 *
 * Instead of only posting a job and waiting for applicants, the
 * employer browses fixed-price listings ("Cleaning — per room —
 * UGX 20,000"), compares fundis by rating, and books in one tap.
 * The listed price becomes the agreed job price — no negotiation
 * needed before work starts.
 *
 * Ranking is MERIT ONLY (rating, then completed jobs); the top 3
 * carry the same "Top Rated" badge as FundiFinder. No paid placement.
 */
export default function ServiceBrowser() {
  const { t } = useI18n();
  const [category, setCategory] = useState('');
  const [q, setQ] = useState('');
  const [activeQ, setActiveQ] = useState('');
  const [services, setServices] = useState<ServiceListing[] | null>(null);
  const [loading, setLoading] = useState(true);

  const search = useCallback(async (cat: string, query: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (cat) params.set('category', cat);
      if (query) params.set('q', query);
      const res = await fetch(`/api/services?${params.toString()}`);
      const data = await res.json();
      setServices(res.ok ? data.services : []);
    } catch {
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Continue a search started on the landing page hero: the visitor
    // typed there, logged in, and lands here — honour their query once.
    let initialQ = '';
    try {
      initialQ = localStorage.getItem('kola_search_query') ?? '';
      if (initialQ) localStorage.removeItem('kola_search_query');
    } catch {}
    if (initialQ) { setQ(initialQ); setActiveQ(initialQ); }
    search('', initialQ);
  }, [search]);

  const pickCategory = (c: string) => {
    const next = category === c ? '' : c;
    setCategory(next);
    search(next, activeQ);
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveQ(q.trim());
    search(category, q.trim());
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-slate-900 font-black text-base">{t('svcb.title')}</h2>
      </div>
      <p className="text-slate-400 text-xs mb-3">{t('svcb.subtitle')}</p>

      {/* Search */}
      <form onSubmit={submitSearch} className="flex gap-2 mb-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder={t('svcb.searchPh')}
            className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
          />
        </div>
        <button type="submit"
          className="px-5 py-3 rounded-2xl text-white text-sm font-black active:scale-95 transition-transform"
          style={{ background: 'linear-gradient(135deg,#2952E8,#1A2DB8)' }}>
          {t('common.search')}
        </button>
      </form>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 mb-4 -mx-1 px-1">
        {JOB_CATEGORIES.map(c => (
          <button key={c} onClick={() => pickCategory(c)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
            style={{
              background: category === c ? '#2952E8' : '#fff',
              color: category === c ? '#fff' : '#4A5580',
              borderColor: category === c ? '#2952E8' : '#E2E6F0',
            }}>
            {translateCategory(c, t)}
          </button>
        ))}
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 size={24} className="animate-spin text-blue-500" />
        </div>
      ) : !services || services.length === 0 ? (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm text-center">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mx-auto mb-3">
            <Tag size={24} color="#2952E8" />
          </div>
          <p className="text-slate-600 font-semibold text-sm">{t('svcb.noneTitle')}</p>
          <p className="text-slate-400 text-xs mt-1">{t('svcb.noneSub')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {services.map(s => (
            <div key={s.id}
              className="bg-white rounded-2xl p-4 border border-blue-100/40 hover:shadow-[0_12px_32px_rgba(41,82,232,0.12)] transition-all duration-200 relative">
              {s.topRated && (
                <span className="absolute top-3 right-3 flex items-center gap-1 bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-0.5 rounded-full">
                  <Award size={10} /> {t('employer.topRated')}
                </span>
              )}
              <div className="flex items-start gap-3">
                {s.worker.avatar ? (
                  <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0" style={{ border: '1.5px solid rgba(41,82,232,0.12)' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.worker.avatar} alt={s.worker.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg,#2952E8,#1A2DB8)' }}>
                    <span className="text-white font-black text-lg">{s.worker.name.charAt(0)}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[#0A0F2C] text-sm leading-tight pr-16">{s.title}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <p className="text-[#8B94B8] text-xs truncate">{s.worker.name}</p>
                    {s.worker.isVerified && (
                      <span title="ID-verified: National ID + 2 reference calls, checked by our team">
                        <ShieldCheck size={11} color="#2952E8" strokeWidth={2} />
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-[#8B94B8]">
                    <span className="flex items-center gap-0.5">
                      <Star size={10} className="text-yellow-500 fill-yellow-500" />
                      <span className="font-bold text-[#0A0F2C]">
                        {s.worker.rating != null ? s.worker.rating.toFixed(1) : t('common.new')}
                      </span>
                      ({s.worker.completedJobs})
                    </span>
                    {s.worker.location && (
                      <span className="flex items-center gap-0.5 truncate">
                        <MapPin size={9} /> {s.worker.location}
                      </span>
                    )}
                  </div>
                  <p className="font-black text-[#2952E8] text-sm mt-1.5">
                    {formatUgx(s.priceUgx)}
                    {s.unitLabel && <span className="text-[#8B94B8] font-semibold text-xs"> · {s.unitLabel}</span>}
                  </p>
                </div>
              </div>
              <Link href={`/employer/book/${s.id}`} className="block mt-3">
                <button className="w-full py-2.5 rounded-xl text-xs font-black active:scale-95 transition-transform text-white"
                  style={{ background: 'linear-gradient(135deg,#2952E8,#1A2DB8)' }}>
                  {t('svcb.book')}
                </button>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
