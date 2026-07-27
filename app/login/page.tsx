'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Search, Zap, Banknote } from 'lucide-react';
import { TukolaLogo } from '@/components/TukolaLogo';

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // First-time visitors go through onboarding before login.
  // Returning users (server session will resolve on /api/auth/me) must NOT
  // be sent through onboarding again.
  useEffect(() => {
    if (!localStorage.getItem('kola_onboarded')) {
      router.replace('/onboarding');
    }
  }, [router]);

  const handleContinue = async () => {
    const cleaned = phone.replace(/[\s\-]/g, '');
    if (cleaned.length < 9) {
      setError('Enter a valid 9-digit Uganda phone number');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: `+256${cleaned}` }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? 'Could not send the code. Please try again.');
        setLoading(false);
        return;
      }
      localStorage.setItem('kola_phone', data.phone ?? `+256${cleaned}`);
      // Mock provider only, non-production: carry the dev code for the demo hint
      if (data?.devCode) {
        try { sessionStorage.setItem('kola_dev_code', data.devCode); } catch {}
      }
      router.push('/verify');
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: '#F0F4FF' }}>

      {/* Desktop: left hero panel */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[40%] relative overflow-hidden flex-col items-center justify-center"
        style={{ background: 'linear-gradient(160deg, #00C8FF 0%, #2952E8 55%, #1A2DB8 100%)' }}>
        {/* Orbs */}
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />
        <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #00C8FF 0%, transparent 70%)' }} />
        <div className="absolute top-1/3 left-1/4 w-24 h-24 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />

        <div className="relative z-10 flex flex-col items-center gap-4 text-center px-8">
          <TukolaLogo variant="mark" size="lg" />
          <TukolaLogo variant="wordmark" size="md" onDark={true} />
          <p className="text-white/60 text-xs font-semibold tracking-wider uppercase mt-2">Uganda&apos;s #1 Gig Platform</p>
          <div className="mt-8 space-y-3 text-left">
            {[
              { icon: <Search size={18} className="text-white/90" />, text: 'Find trusted workers near you' },
              { icon: <Zap size={18} className="text-white/90" />, text: 'Post jobs & get hired in minutes' },
              { icon: <Banknote size={18} className="text-white/90" />, text: 'Safe payments & fair ratings' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 glass rounded-xl px-4 py-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                  {item.icon}
                </div>
                <span className="text-white/90 text-sm font-medium">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10 lg:px-12 lg:py-16">
        {/* Mobile hero */}
        <div className="lg:hidden w-full relative overflow-hidden px-6 pt-12 pb-14 flex flex-col items-center rounded-3xl mb-6"
          style={{ background: 'linear-gradient(160deg, #00C8FF 0%, #2952E8 55%, #1A2DB8 100%)' }}>
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full opacity-15"
            style={{ background: 'radial-gradient(circle, #00C8FF 0%, transparent 70%)' }} />
          <div className="relative z-10 flex flex-col items-center gap-3">
            <TukolaLogo variant="mark" size="lg" />
            <TukolaLogo variant="wordmark" size="md" onDark={true} />
            <p className="text-white/60 text-xs font-semibold tracking-wider uppercase">Uganda&apos;s #1 Gig Platform</p>
          </div>
        </div>

        {/* Form card */}
        <div className="w-full max-w-md mx-auto">
          <div className="rounded-3xl p-6 lg:p-8 mb-4" style={{ background: '#fff', boxShadow: '0 8px 40px rgba(41,82,232,0.12)', border: '1px solid rgba(41,82,232,0.06)' }}>
            <h2 className="text-lg font-black text-[#0A0F2C] mb-1">Welcome back</h2>
            <p className="text-sm text-[#8B94B8] mb-5 font-medium">Enter your phone number to continue</p>

            {/* Phone input */}
            <div className="mb-1.5">
              <div className="flex gap-2">
                <div className="flex items-center gap-2 rounded-2xl px-3 py-4 min-w-fit"
                  style={{ background: '#F0F4FF', border: '1.5px solid rgba(41,82,232,0.12)' }}>
                  <span className="text-xs font-bold text-[#2952E8]">UG</span>
                  <span className="text-sm font-bold" style={{ color: '#0A0F2C' }}>+256</span>
                </div>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={e => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 9)); setError(''); }}
                  placeholder="712 345 678"
                  className="flex-1 rounded-2xl px-4 py-4 text-sm font-semibold placeholder-[#C0C8E0] transition-all"
                  style={{
                    background: error ? '#FFF1F0' : '#F0F4FF',
                    border: `1.5px solid ${error ? '#EF4444' : 'rgba(41,82,232,0.12)'}`,
                    color: '#0A0F2C',
                    outline: 'none',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#2952E8'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(41,82,232,0.08)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = error ? '#EF4444' : 'rgba(41,82,232,0.12)'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>
            </div>

            {error && <p className="text-[10px] font-semibold mb-3 mt-1.5" style={{ color: '#EF4444' }}>{error}</p>}
            {!error && <p className="text-[11px] text-[#8B94B8] mb-5 mt-2 font-medium">We&apos;ll send a 6-digit verification code.</p>}

            <button onClick={handleContinue} disabled={loading}
              className="w-full text-white rounded-2xl py-4 font-bold text-base flex items-center justify-center gap-2 btn-scale disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #00C8FF 0%, #2952E8 50%, #1A2DB8 100%)', boxShadow: '0 8px 24px rgba(41,82,232,0.4)' }}>
              {loading ? 'Sending code...' : <>Continue <ArrowRight size={18} /></>}
            </button>
          </div>
        </div>

        <p className="text-center text-[11px] px-6 pb-6 pt-2 max-w-md" style={{ color: '#8B94B8' }}>
          By continuing, you agree to TUKOLA&apos;s{' '}
          <span style={{ color: '#2952E8' }} className="font-semibold">Terms</span> &{' '}
          <span style={{ color: '#2952E8' }} className="font-semibold">Privacy Policy</span>
        </p>
      </div>
    </div>
  );
}
