'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Search, Zap, Banknote } from 'lucide-react';
import { TukolaLogo } from '@/components/TukolaLogo';

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleContinue = () => {
    const cleaned = phone.replace(/[\s\-]/g, '');
    if (cleaned.length < 9) {
      setError('Enter a valid 9-digit Uganda phone number');
      return;
    }
    localStorage.setItem('kola_phone', `+256${cleaned}`);
    router.push('/verify');
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
            {!error && <p className="text-[11px] text-[#8B94B8] mb-5 mt-2 font-medium">We&apos;ll send a 4-digit verification code.</p>}

            <button onClick={handleContinue}
              className="w-full text-white rounded-2xl py-4 font-bold text-base flex items-center justify-center gap-2 btn-scale"
              style={{ background: 'linear-gradient(135deg, #00C8FF 0%, #2952E8 50%, #1A2DB8 100%)', boxShadow: '0 8px 24px rgba(41,82,232,0.4)' }}>
              Continue <ArrowRight size={18} />
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: 'rgba(41,82,232,0.1)' }} />
            <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#8B94B8' }}>or</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(41,82,232,0.1)' }} />
          </div>

          {/* Social buttons */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button className="flex items-center justify-center gap-2 rounded-2xl py-3.5 btn-scale"
              style={{ background: '#fff', border: '1.5px solid rgba(41,82,232,0.1)', boxShadow: '0 2px 8px rgba(41,82,232,0.05)' }}>
              <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: '#1877F2' }}>
                <span className="text-white text-xs font-black">f</span>
              </div>
              <span className="text-sm font-bold" style={{ color: '#0A0F2C' }}>Facebook</span>
            </button>
            <button className="flex items-center justify-center gap-2 rounded-2xl py-3.5 btn-scale"
              style={{ background: '#fff', border: '1.5px solid rgba(41,82,232,0.1)', boxShadow: '0 2px 8px rgba(41,82,232,0.05)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span className="text-sm font-bold" style={{ color: '#0A0F2C' }}>Google</span>
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
