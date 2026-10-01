'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TukolaLogo } from '@/components/TukolaLogo';
import { ArrowRight, Hammer, Wrench, Zap, Paintbrush, Sparkles, Car, Scissors, Droplets } from 'lucide-react';

/**
 * /coming-soon — the shelved-site landing (site_mode = 'coming_soon').
 *
 * The marketplace is hidden (middleware rewrites employer/job routes here)
 * but FUNDI RECRUITMENT STAYS OPEN: the CTA carries people into the normal
 * OTP signup flow, and ?ref=<code> referral attribution is preserved exactly
 * as the old landing page did it (localStorage → /role → register).
 *
 * The middleware rewrites (not redirects), so visitors keep the clean URL
 * they typed; this page never needs to know how it was reached.
 */

const COLLAGE = [
  '/images/slide-1.jpg', '/images/slide-2.jpg', '/images/slide-3.jpg', '/images/slide-4.jpg',
  '/images/slide-5.jpg', '/images/slide-6.jpg', '/images/slide-7.jpg', '/images/slide-8.jpg',
];

const TRADES = [
  { Icon: Wrench, label: 'Plumbing' },
  { Icon: Zap, label: 'Electrical' },
  { Icon: Hammer, label: 'Carpentry' },
  { Icon: Paintbrush, label: 'Painting' },
  { Icon: Droplets, label: 'Water systems' },
  { Icon: Car, label: 'Mechanics' },
  { Icon: Scissors, label: 'Salon & beauty' },
  { Icon: Sparkles, label: 'Cleaning' },
];

export default function ComingSoonPage() {
  const router = useRouter();

  // Referral capture — identical contract to the shelved landing page:
  // stash ?ref=<code> so the OTP → /role → register flow attributes the
  // signup to the referring fundi.
  useEffect(() => {
    try {
      const ref = new URLSearchParams(window.location.search).get('ref');
      if (ref && /^[A-Za-z0-9]{4,16}$/.test(ref)) {
        localStorage.setItem('kola_referral_code', ref.toUpperCase());
      }
    } catch {}
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: '#0A0F2C' }}>
      {/* ── Full-screen image collage ─────────────────────────────────── */}
      <div className="absolute inset-0 grid grid-cols-2 sm:grid-cols-4 grid-rows-4 sm:grid-rows-2 gap-1 p-1 opacity-40">
        {COLLAGE.map(src => (
          <div key={src} className="relative overflow-hidden rounded-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="w-full h-full object-cover" />
          </div>
        ))}
      </div>
      {/* Readability overlays */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(10,15,44,0.55) 0%, rgba(10,15,44,0.88) 55%, rgba(10,15,44,0.97) 100%)' }} />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 55% at 50% 46%, rgba(10,15,44,0.72) 0%, transparent 100%)' }} />

      {/* ── Content ───────────────────────────────────────────────────── */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-14 text-center">
        <div className="mb-8 animate-slide-up">
          <TukolaLogo variant="full" size="lg" onDark />
        </div>

        <p className="text-[11px] sm:text-xs font-bold tracking-[0.35em] uppercase mb-4 animate-slide-up"
          style={{ color: '#00C8FF' }}>
          Something is being built in Uganda
        </p>

        <h1 className="text-white font-black leading-none mb-4 animate-slide-up-d1"
          style={{ fontSize: 'clamp(56px, 12vw, 128px)', letterSpacing: '-0.02em' }}>
          Coming <span style={{ background: 'linear-gradient(90deg,#00C8FF,#2952E8)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>2027</span>
        </h1>

        <p className="text-white/70 text-sm sm:text-base max-w-md leading-relaxed mb-10 animate-slide-up-d1">
          The trusted way to hire verified fundis — plumbers, electricians, carpenters and more.
          We&apos;re putting the finishing touches on it.
        </p>

        {/* Fundi recruitment CTA — recruitment stays open while shelved */}
        <div className="w-full max-w-md animate-slide-up-d2">
          <button
            onClick={() => router.push('/login')}
            className="group w-full flex items-center justify-center gap-2.5 text-white font-black text-base px-8 py-4 rounded-2xl transition-transform active:scale-[0.98] hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg,#2952E8,#1A2DB8)', boxShadow: '0 12px 40px rgba(41,82,232,0.45)' }}
          >
            Are you a fundi? Join us now
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
          </button>
          <p className="text-white/50 text-xs mt-3 leading-relaxed">
            We&apos;re recruiting fundis ahead of launch. Sign up with your phone number,
            complete your profile, and be first in line when jobs open.
          </p>
        </div>

        {/* Trade chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-10 max-w-lg animate-slide-up-d2">
          {TRADES.map(({ Icon, label }) => (
            <span key={label}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <Icon size={11} /> {label}
            </span>
          ))}
        </div>

        <p className="text-white/30 text-[11px] mt-12 animate-slide-up-d2">
          tukolaapp.com · Kampala, Uganda
        </p>
      </div>
    </div>
  );
}
