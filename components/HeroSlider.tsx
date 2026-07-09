'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { HERO_SLIDES } from '@/lib/constants';

export function HeroSlider() {
  const router = useRouter();
  const [slide, setSlide] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const touchStartX = useRef(0);

  const current = HERO_SLIDES[slide];
  const total = HERO_SLIDES.length;

  const goToSlide = useCallback((index: number, dir: 'next' | 'prev') => {
    if (isAnimating) return;
    setIsAnimating(true);
    setDirection(dir);
    setSlide(index);
    setTimeout(() => setIsAnimating(false), 800);
  }, [isAnimating]);

  const nextSlide = useCallback(() => {
    goToSlide((slide + 1) % total, 'next');
  }, [slide, total, goToSlide]);

  const prevSlide = useCallback(() => {
    goToSlide((slide - 1 + total) % total, 'prev');
  }, [slide, total, goToSlide]);

  // Auto-play
  useEffect(() => {
    timerRef.current = setInterval(nextSlide, 6000);
    return () => clearInterval(timerRef.current);
  }, [nextSlide]);

  // Touch handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) nextSlide();
      else prevSlide();
    }
  };

  return (
    <section
      className="relative mt-14 overflow-hidden"
      style={{ height: 'min(92vh, 720px)' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background Slides with Ken Burns effect */}
      {HERO_SLIDES.map((s, i) => {
        const isActive = i === slide;
        const isPrev = i === (slide - 1 + total) % total;
        const isNext = i === (slide + 1) % total;

        return (
          <div
            key={i}
            className="absolute inset-0"
            style={{
              zIndex: isActive ? 1 : 0,
              opacity: isActive ? 1 : 0,
              transition: 'opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            {/* Ken Burns image */}
            <div
              className="absolute inset-0"
              style={{
                transform: isActive ? 'scale(1.08)' : 'scale(1)',
                transition: isActive ? 'transform 8s ease-out' : 'transform 0.8s ease',
              }}
            >
              <Image
                src={s.src}
                alt={s.caption}
                fill
                style={{ objectFit: 'cover' }}
                priority={i === 0}
                sizes="100vw"
              />
            </div>
            {/* Gradient overlay */}
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(105deg, rgba(10,15,44,0.78) 0%, rgba(41,82,232,0.42) 55%, rgba(0,0,0,0.15) 100%)',
              }}
            />
          </div>
        );
      })}

      {/* Floating particles / ambient effect */}
      <div className="absolute inset-0 z-[2] pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 rounded-full bg-white/20 animate-float" style={{ animationDelay: '0s' }} />
        <div className="absolute top-1/3 right-1/3 w-1.5 h-1.5 rounded-full bg-white/15 animate-float" style={{ animationDelay: '1.5s' }} />
        <div className="absolute bottom-1/3 left-1/3 w-1 h-1 rounded-full bg-white/20 animate-float" style={{ animationDelay: '3s' }} />
        <div className="absolute top-2/3 right-1/4 w-2 h-2 rounded-full bg-white/10 animate-float" style={{ animationDelay: '2s' }} />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-center max-w-6xl mx-auto px-5 lg:px-8">
        <div className="max-w-2xl">
          {/* Trust badge */}
          <div
            className="inline-flex items-center gap-2 mb-5 px-3 py-1.5 rounded-full border border-white/20"
            style={{
              background: 'rgba(255,255,255,0.12)',
              backdropFilter: 'blur(12px)',
              opacity: 0,
              animation: isAnimating ? 'none' : 'slideUp 0.5s ease-out 0.2s forwards',
            }}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-white/80 text-xs font-semibold">127 active jobs right now · Uganda&apos;s #1 gig platform</span>
          </div>

          {/* Title with staggered animation */}
          <h1
            className="text-4xl sm:text-5xl lg:text-[3.5rem] font-black text-white leading-[1.08] mb-4"
            style={{
              textShadow: '0 2px 24px rgba(0,0,0,0.4)',
              opacity: 0,
              animation: isAnimating ? 'none' : 'slideUp 0.6s ease-out 0.4s forwards',
            }}
          >
            {current.caption}
          </h1>

          {/* Subtitle */}
          <p
            className="text-white/75 text-base lg:text-lg mb-7 font-medium leading-relaxed"
            style={{
              opacity: 0,
              animation: isAnimating ? 'none' : 'slideUp 0.6s ease-out 0.6s forwards',
            }}
          >
            {current.sub}
          </p>

          {/* Search bar */}
          <div
            className="flex flex-col sm:flex-row gap-2.5 mb-6 max-w-lg"
            style={{
              opacity: 0,
              animation: isAnimating ? 'none' : 'slideUp 0.6s ease-out 0.8s forwards',
            }}
          >
            <div className="flex-1 flex items-center gap-2.5 px-4 py-3.5 rounded-xl bg-white/95 shadow-lg backdrop-blur-sm">
              <Search size={18} className="text-gray-400 flex-shrink-0" />
              <input
                readOnly
                placeholder="Search a service e.g. Plumber, Driver…"
                onClick={() => router.push('/onboarding')}
                className="bg-transparent text-sm text-gray-700 placeholder-gray-400 w-full outline-none cursor-pointer"
              />
            </div>
            <Link
              href="/onboarding"
              className="flex items-center justify-center gap-1.5 px-6 py-3.5 rounded-xl font-bold text-white text-sm flex-shrink-0 btn-scale"
              style={{
                background: 'linear-gradient(135deg, #2952E8, #1A2DB8)',
                boxShadow: '0 4px 20px rgba(41,82,232,0.5)',
              }}
            >
              Find Now <ArrowRight size={15} />
            </Link>
          </div>

          {/* Quick tags */}
          <div
            className="flex flex-wrap gap-2"
            style={{
              opacity: 0,
              animation: isAnimating ? 'none' : 'slideUp 0.6s ease-out 1.0s forwards',
            }}
          >
            {['Cleaner', 'Plumber', 'Driver', 'Cook', 'Builder', 'Security'].map((t) => (
              <Link
                key={t}
                href="/onboarding"
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-white border border-white/25 hover:bg-white/20 hover:border-white/40 transition-all btn-scale"
                style={{
                  background: 'rgba(255,255,255,0.12)',
                  backdropFilter: 'blur(4px)',
                }}
              >
                {t}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Slide Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center border border-white/20 transition-all btn-scale hidden sm:flex"
      >
        <ChevronLeft size={20} color="white" />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center border border-white/20 transition-all btn-scale hidden sm:flex"
      >
        <ChevronRight size={20} color="white" />
      </button>

      {/* Slide Progress Indicators */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
        {HERO_SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => goToSlide(i, i > slide ? 'next' : 'prev')}
            className="relative group"
          >
            <div
              className="h-1 rounded-full transition-all duration-500"
              style={{
                width: i === slide ? 40 : 12,
                background: i === slide ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)',
              }}
            />
            {i === slide && (
              <div
                className="absolute inset-0 h-1 rounded-full bg-white/60"
                style={{
                  animation: 'progressSlide 6s linear forwards',
                  transformOrigin: 'left',
                }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Slide counter */}
      <div className="absolute bottom-8 right-6 z-20 text-white/40 text-xs font-bold hidden sm:block">
        {String(slide + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
      </div>
    </section>
  );
}
