'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Briefcase, UserSearch, ShieldCheck, Tag, Loader2 } from 'lucide-react';
import { useKola } from '@/lib/store';
import { TukolaLogo } from '@/components/TukolaLogo';
import LanguageSwitch from '@/components/LanguageSwitch';
import { useI18n } from '@/lib/i18n';
import { translateCategory } from '@/lib/i18n';
import { JOB_CATEGORIES } from '@/lib/constants';
import { templatesFor } from '@/lib/service-suggestions';

export default function RoleSelectionPage() {
  const [selected, setSelected] = useState<'worker' | 'employer' | null>(null);
  const [name, setName] = useState('');
  const [step, setStep] = useState<'role' | 'name' | 'firstService'>('role');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // First-service step (workers only): listing one priced service at
  // signup makes a new fundi bookable IMMEDIATELY — fixes the
  // empty-marketplace cold start for employers.
  const [fsCategory, setFsCategory] = useState('');
  const [fsTitle, setFsTitle] = useState('');
  const [fsUnit, setFsUnit] = useState('');
  const [fsPrice, setFsPrice] = useState('');
  const { register } = useKola();
  const router = useRouter();
  const { t } = useI18n();

  const phone =
    typeof window !== 'undefined' ? localStorage.getItem('kola_phone') || '+256000000000' : '+256000000000';

  const handleRoleSelect = (role: 'worker' | 'employer') => {
    setSelected(role);
    setTimeout(() => setStep('name'), 150);
  };

  const handleContinue = async () => {
    if (!name.trim() || !selected) return;
    setLoading(true);
    setError('');
    // Referral code stashed from ?ref= on the landing page (OTP-only
    // signup has no referral field) — forwarded for server-side
    // attribution; cleared on success so a resumed account or a later
    // signup on this device never inherits it.
    const referralCode =
      typeof window !== 'undefined' ? localStorage.getItem('kola_referral_code') : null;
    const user = await register(phone, name.trim(), selected, referralCode);
    if (user) {
      try { localStorage.removeItem('kola_referral_code'); } catch {}
      if (selected === 'worker') {
        setStep('firstService');
        setLoading(false);
      } else {
        router.push('/employer');
      }
    } else {
      setError(t('role.errorCreate'));
      setLoading(false);
    }
  };

  const publishFirstService = async () => {
    const price = parseInt(fsPrice, 10);
    if (!fsCategory || !fsTitle.trim() || !Number.isInteger(price) || price <= 0) return;
    setLoading(true);
    try {
      await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: fsTitle.trim(),
          category: fsCategory,
          unitLabel: fsUnit || undefined,
          priceUgx: price,
        }),
      });
    } catch { /* service can be added later from the profile */ }
    router.push('/worker');
  };

  if (step === 'firstService') {
    const canPublish = fsCategory && fsTitle.trim() && parseInt(fsPrice, 10) > 0;
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <div className="px-5 lg:px-12 pt-10 pb-2 flex items-center justify-between">
          <TukolaLogo variant="full" size="sm" />
          <LanguageSwitch />
        </div>
        <div className="flex-1 px-5 lg:px-12 py-6 max-w-2xl mx-auto w-full">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center mb-5">
            <Tag size={26} className="text-white" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">{t('role.fsTitle')}</h2>
          <p className="text-slate-500 text-sm mb-6">{t('role.fsSub')}</p>

          {/* Category */}
          <p className="text-slate-700 font-semibold text-sm mb-2">{t('svc.fieldCategory')}</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {JOB_CATEGORIES.map(c => (
              <button key={c} onClick={() => { setFsCategory(c); setFsTitle(''); setFsUnit(''); }}
                className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
                style={{
                  background: fsCategory === c ? '#2952E8' : '#fff',
                  color: fsCategory === c ? '#fff' : '#4A5580',
                  borderColor: fsCategory === c ? '#2952E8' : '#E2E6F0',
                }}>
                {translateCategory(c, t)}
              </button>
            ))}
          </div>

          {/* Templates */}
          {fsCategory && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {templatesFor(fsCategory).map(tp => (
                <button key={tp.title}
                  onClick={() => { setFsTitle(tp.title); setFsUnit(tp.unit); }}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all active:scale-95 ${
                    fsTitle === tp.title ? 'bg-blue-600 text-white border-blue-600' : 'bg-blue-50 text-blue-700 border-blue-100'
                  }`}>
                  {tp.title} · {tp.unit}
                </button>
              ))}
            </div>
          )}

          {/* Title (editable after template tap) */}
          {fsCategory && (
            <input value={fsTitle} onChange={e => setFsTitle(e.target.value)}
              placeholder={t('svc.fieldTitlePh')} maxLength={80}
              className="w-full border-2 border-slate-200 rounded-2xl px-4 py-3 text-slate-900 text-sm font-semibold placeholder-slate-400 focus:border-blue-500 focus:ring-0 bg-white mb-3" />
          )}

          {/* Price */}
          {fsCategory && (
            <div className="flex gap-3 mb-6">
              <input type="number" inputMode="numeric" value={fsPrice} onChange={e => setFsPrice(e.target.value)}
                placeholder={t('role.fsPricePh')}
                className="flex-1 border-2 border-slate-200 rounded-2xl px-4 py-3 text-slate-900 text-sm font-semibold placeholder-slate-400 focus:border-blue-500 focus:ring-0 bg-white" />
              <div className="flex items-center px-4 rounded-2xl bg-slate-100 text-slate-500 text-xs font-bold flex-shrink-0">
                {fsUnit || 'UGX'}
              </div>
            </div>
          )}

          <button onClick={publishFirstService} disabled={!canPublish || loading}
            className={`w-full py-4 rounded-2xl font-bold text-base transition-all active:scale-95 flex items-center justify-center gap-2 ${
              canPublish ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}>
            {loading && <Loader2 size={16} className="animate-spin" />}
            {t('role.fsPublish')}
          </button>
          <button onClick={() => router.push('/worker')}
            className="text-slate-400 text-sm text-center mt-4 active:opacity-70 w-full">
            {t('role.fsSkip')}
          </button>
        </div>
      </div>
    );
  }

  if (step === 'name') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
        {/* Desktop left panel */}
        <div className="hidden lg:flex lg:w-[40%] xl:w-[35%] relative overflow-hidden items-center justify-center"
          style={{ background: 'linear-gradient(160deg, #00C8FF 0%, #2952E8 55%, #1A2DB8 100%)' }}>
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />
          <div className="relative z-10 text-center px-8">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-5 backdrop-blur-sm"
              style={{ border: '1px solid rgba(255,255,255,0.2)' }}>
              {selected === 'worker' ? (
                <Briefcase size={28} className="text-white" />
              ) : (
                <UserSearch size={28} className="text-white" />
              )}
            </div>
            <h2 className="text-2xl font-black text-white mb-2">
              {selected === 'worker' ? t('role.welcomeWorker') : t('role.welcomeEmployer')}
            </h2>
            <p className="text-white/70 text-sm">
              {selected === 'worker' ? t('role.nameSubWorker') : t('role.nameSubEmployer')}
            </p>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center px-6 py-16 lg:px-12 lg:py-16">
          <div className="max-w-md mx-auto w-full">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${
              selected === 'worker' ? 'bg-blue-600' : 'bg-blue-600'
            }`}>
              {selected === 'worker' ? (
                <Briefcase size={28} className="text-white" />
              ) : (
                <UserSearch size={28} className="text-white" />
              )}
            </div>

            <h2 className="text-2xl font-black text-slate-900 mb-2">{t('role.yourName')}</h2>
            <p className="text-slate-500 text-sm mb-8">
              {selected === 'worker' ? t('role.nameSubWorker') : t('role.nameSubEmployer')}
            </p>

            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t('role.namePlaceholder')}
              autoFocus
              className="w-full border-2 border-slate-200 rounded-2xl px-4 py-4 text-slate-900 text-lg font-semibold placeholder-slate-400 focus:border-blue-500 focus:ring-0 transition-colors bg-white mb-6"
            />

            <button
              onClick={handleContinue}
              disabled={!name.trim() || loading}
              className={`w-full py-4 rounded-2xl font-bold text-base transition-all active:scale-95 ${
                name.trim()
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {loading ? t('role.setup') : t('role.finish')}
            </button>

            {error && (
              <p className="text-red-500 text-sm font-medium text-center mt-3">{error}</p>
            )}

            <button
              onClick={() => setStep('role')}
              className="text-slate-400 text-sm text-center mt-4 active:opacity-70 w-full"
            >
              {t('role.changeRole')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Desktop left panel */}
      <div className="hidden lg:flex lg:w-[40%] xl:w-[35%] relative overflow-hidden items-center justify-center"
        style={{ background: 'linear-gradient(160deg, #00C8FF 0%, #2952E8 55%, #1A2DB8 100%)' }}>
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />
        <div className="relative z-10 text-center px-8">
          <TukolaLogo variant="mark" size="lg" />
          <div className="mt-3">
            <TukolaLogo variant="wordmark" size="md" onDark={true} />
          </div>
          <p className="text-white/60 text-xs font-semibold tracking-wider uppercase mt-4">{t('login.tagline')}</p>
          <div className="mt-4 flex justify-center"><LanguageSwitch onDark /></div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="px-5 lg:px-12 pt-12 lg:pt-16 pb-4 flex items-center justify-between">
          <TukolaLogo variant="full" size="sm" />
          <LanguageSwitch />
        </div>

        <div className="px-5 lg:px-12 pt-2 pb-6 animate-slide-up">
          <h1 className="text-2xl font-black text-[#0A0F2C] mb-1.5">{t('role.welcome')}</h1>
          <p className="text-[#4A5580] text-sm">{t('role.choose')}</p>
        </div>

        {/* Role cards */}
        <div className="px-5 lg:px-12 space-y-4 flex-1 max-w-2xl">
          {/* Worker card */}
          <button
            onClick={() => handleRoleSelect('worker')}
            className={`w-full text-left bg-white rounded-2xl p-5 lg:p-6 border-2 transition-all active:scale-[0.98] shadow-sm animate-slide-up-d1 hover:shadow-[0_10px_36px_rgba(41,82,232,0.14)] hover:-translate-y-0.5 ${
              selected === 'worker' ? 'border-blue-600 shadow-blue-100' : 'border-slate-100'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Briefcase size={26} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-black text-slate-900 mb-1">{t('role.needWork')}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  {t('role.needWorkSub')}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {['Cleaning', 'Plumbing', 'Moving', 'Building'].map(tag => (
                    <span key={tag} className="text-[11px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </button>

          {/* Employer card */}
          <button
            onClick={() => handleRoleSelect('employer')}
            className={`w-full text-left bg-white rounded-2xl p-5 lg:p-6 border-2 transition-all active:scale-[0.98] shadow-sm animate-slide-up-d2 hover:shadow-[0_10px_36px_rgba(41,82,232,0.14)] hover:-translate-y-0.5 ${
              selected === 'employer' ? 'border-blue-600 shadow-blue-100' : 'border-slate-100'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center flex-shrink-0">
                <UserSearch size={26} className="text-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-black text-slate-900 mb-1">{t('role.wantHire')}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  {t('role.wantHireSub')}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {['Post Jobs', 'Quick Hiring', 'Rated Workers'].map(tag => (
                    <span key={tag} className="text-[11px] bg-orange-50 text-orange-500 px-2 py-0.5 rounded-full font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="px-5 lg:px-12 pb-10 pt-6 flex items-center justify-center gap-2 text-xs" style={{ color: '#8B94B8' }}>
          <ShieldCheck size={14} />
          <span>{t('role.secureNote')}</span>
        </div>
      </div>
    </div>
  );
}
