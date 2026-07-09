'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { TukolaLogo } from '@/components/TukolaLogo';

const slides = [
  {
    image: '/images/slide-2.jpg',
    overlay: 'linear-gradient(to top, rgba(10,15,44,0.97) 0%, rgba(10,15,44,0.65) 55%, rgba(10,15,44,0.25) 100%)',
    accent: '#00C8FF',
    tag: 'For Workers',
    tagColor: '#00C8FF',
    title: 'Find daily jobs\nnear you',
    description: 'Discover local gigs for cleaning, building, driving and more — right in your neighbourhood.',
  },
  {
    image: '/images/slide-5.jpg',
    overlay: 'linear-gradient(to top, rgba(26,45,184,0.97) 0%, rgba(26,45,184,0.6) 55%, rgba(0,0,0,0.2) 100%)',
    accent: '#2952E8',
    tag: 'For Employers',
    tagColor: '#fff',
    title: 'Hire trusted\nworkers fast',
    description: 'Post a job in under 1 minute and get matched with verified, rated workers instantly.',
  },
  {
    image: '/images/slide-7.jpg',
    overlay: 'linear-gradient(to top, rgba(10,15,44,0.97) 0%, rgba(41,82,232,0.55) 55%, rgba(0,0,0,0.15) 100%)',
    accent: '#00C8FF',
    tag: 'Get Paid',
    tagColor: '#00C8FF',
    title: 'Get it done.\nGet paid.',
    description: 'Complete jobs, build your reputation, and grow your income on TUKOLA.',
  },
];

export default function OnboardingPage() {
  const [current, setCurrent] = useState(0);
  const router = useRouter();
  const slide = slides[current];
  const isLast = current === slides.length - 1;

  const handleNext = () => {
    if (!isLast) { setCurrent(c => c + 1); return; }
    localStorage.setItem('kola_onboarded', 'true');
    router.push('/login');
  };

  const handleSkip = () => {
    localStorage.setItem('kola_onboarded', 'true');
    router.push('/login');
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0A0F2C] flex items-center justify-center">

      {/* ── Full-screen image background with crossfade ── */}
      {slides.map((s, i) => (
        <div key={i} className="absolute inset-0 transition-opacity duration-700"
          style={{ opacity: i === current ? 1 : 0, zIndex: 0 }}>
          <Image src={s.image} alt={s.tag} fill style={{ objectFit: 'cover' }} priority={i === 0} />
          <div className="absolute inset-0" style={{ background: s.overlay }} />
          {/* Desktop overlay for better readability */}
          <div className="hidden lg:block absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(10,15,44,0.85) 0%, rgba(10,15,44,0.4) 50%, rgba(10,15,44,0.7) 100%)' }} />
        </div>
      ))}

      {/* ── Top bar: Logo + Skip ── */}
      <div className="relative z-10 flex items-center justify-between px-6 lg:px-12 pt-14 pb-2 w-full absolute top-0 left-0 right-0">
        <TukolaLogo variant="mark" size="sm" />
        <button onClick={handleSkip}
          className="text-xs font-bold px-4 py-2 rounded-xl transition-all"
          style={{ color: 'rgba(255,255,255,0.65)', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}>
          Skip
        </button>
      </div>

      {/* ── Desktop: centered content card ── */}
      <div className="relative z-10 w-full max-w-lg lg:max-w-xl mx-auto px-5 lg:px-0 lg:mt-16">
        {/* Slide indicators (top) */}
        <div className="flex gap-1.5 mb-6">
          {slides.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)}
              className="h-1 rounded-full transition-all duration-500 flex-1"
              style={{ background: i === current ? '#fff' : 'rgba(255,255,255,0.25)', opacity: i < current ? 0.9 : 1 }} />
          ))}
        </div>

        {/* ── Content card ── */}
        <div className="lg:glass rounded-3xl lg:p-8">
          {/* Tag chip */}
          <span className="inline-block text-[11px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-full mb-4"
            style={{ background: 'rgba(255,255,255,0.15)', color: slide.tagColor, backdropFilter: 'blur(8px)', border: `1px solid ${slide.tagColor}44` }}>
            {slide.tag}
          </span>

          {/* Headline */}
          <h2 className="text-4xl lg:text-5xl font-black text-white leading-[1.1] mb-3 whitespace-pre-line"
            style={{ textShadow: '0 2px 16px rgba(0,0,0,0.3)' }}>
            {slide.title}
          </h2>

          {/* Description */}
          <p className="text-white/65 text-sm lg:text-base leading-relaxed mb-8 max-w-xs">{slide.description}</p>

          {/* Primary CTA */}
          <button onClick={handleNext}
            className="w-full text-white rounded-2xl py-4 text-base font-black flex items-center justify-center gap-2 mb-3 active:scale-95 transition-transform"
            style={{ background: isLast ? 'linear-gradient(135deg,#00C8FF,#2952E8)' : '#2952E8', boxShadow: `0 8px 28px rgba(41,82,232,0.45)` }}>
            {isLast ? 'Get Started Free' : 'Continue'}
            {isLast ? <ArrowRight size={20} strokeWidth={2.5} /> : <ChevronRight size={20} strokeWidth={2.5} />}
          </button>

          {/* Sign in link */}
          {isLast ? (
            <button onClick={() => router.push('/login')}
              className="w-full py-3.5 text-sm font-bold rounded-2xl transition-all"
              style={{ color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)' }}>
              Already have an account? Sign in
            </button>
          ) : (
            <button onClick={handleSkip} className="w-full py-3 text-sm font-semibold text-center"
              style={{ color: 'rgba(255,255,255,0.45)' }}>
              Skip intro
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
