'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Star, Check, ArrowRight, Download,
  Smartphone, Search, Menu, X, Sparkles, Droplets, Zap, Hammer,
  Truck, Leaf, UtensilsCrossed, ShieldCheck, Car, Calendar,
  Scissors, Wrench, Sprout, Package, Smile, MoreHorizontal,
  MapPin, BadgeCheck, TrendingUp, Quote, Users,
} from 'lucide-react';
import { CustomCursor } from '@/components/CustomCursor';
import { BackToTop } from '@/components/BackToTop';
import { TukolaLogo } from '@/components/TukolaLogo';
import { HeroSlider } from '@/components/HeroSlider';
import { SKILL_OPTIONS } from '@/lib/constants';
import {
  useScrollAnimation,
  getScrollAnimationClasses,
  useCountUp,
  useStaggerAnimation,
  useParallax,
  useMagneticEffect,
  useScrollProgress,
  type AnimationType,
} from '@/hooks/useScrollAnimation';

const SERVICE_ICONS = [
  { label: 'Cleaning',     icon: Sparkles,       color: '#059669', bg: '#ECFDF5' },
  { label: 'Plumbing',     icon: Droplets,       color: '#0369A1', bg: '#DBEAFE' },
  { label: 'Electrical',   icon: Zap,            color: '#D97706', bg: '#FEF3C7' },
  { label: 'Construction', icon: Hammer,         color: '#7C3AED', bg: '#EDE9FE' },
  { label: 'Moving',       icon: Truck,          color: '#DC2626', bg: '#FEE2E2' },
  { label: 'Gardening',    icon: Leaf,           color: '#16A34A', bg: '#DCFCE7' },
  { label: 'Cooking',      icon: UtensilsCrossed,color: '#EA580C', bg: '#FFEDD5' },
  { label: 'Security',     icon: ShieldCheck,    color: '#1D4ED8', bg: '#EFF6FF' },
  { label: 'Driving',      icon: Car,            color: '#0F172A', bg: '#F1F5F9' },
  { label: 'Events',       icon: Calendar,       color: '#9333EA', bg: '#F3E8FF' },
  { label: 'Tailoring',    icon: Scissors,       color: '#BE185D', bg: '#FCE7F3' },
  { label: 'Repair',       icon: Wrench,         color: '#0369A1', bg: '#E0F2FE' },
  { label: 'Farming',      icon: Sprout,         color: '#15803D', bg: '#DCFCE7' },
  { label: 'Beauty',       icon: Smile,          color: '#EC4899', bg: '#FDF4FF' },
  { label: 'Delivery',     icon: Package,        color: '#6D28D9', bg: '#EDE9FE' },
  { label: 'More',         icon: MoreHorizontal, color: '#6B7280', bg: '#F9FAFB' },
];

const STEPS = [
  { n: '01', icon: Smartphone, title: 'Create a free profile', desc: 'Sign up with just your phone number. No CV, no paperwork, no fees.', tag: 'Takes 60 seconds' },
  { n: '02', icon: Search,     title: 'Post or browse jobs',   desc: 'Employers post in seconds. Workers browse nearby gigs and apply instantly.', tag: 'Matches by location' },
  { n: '03', icon: Check,      title: 'Work & get paid',       desc: 'Meet, complete the job, get paid. Rate each other to build trust.', tag: 'Instant payment' },
];

const WHY_ITEMS = [
  { icon: BadgeCheck,  title: 'Verified Profiles',   desc: 'Every worker is reviewed and rated by real employers before being featured.', color: '#2952E8', bg: '#EEF2FF' },
  { icon: Zap,         title: 'Hire in 5 Minutes',   desc: 'Post a job and receive applications from nearby workers almost instantly.', color: '#D97706', bg: '#FEF3C7' },
  { icon: TrendingUp,  title: 'Transparent Ratings', desc: 'Real reviews after every completed job. Only the best workers rank higher.', color: '#059669', bg: '#ECFDF5' },
  { icon: MapPin,      title: 'Location-First',      desc: 'Jobs and workers matched by proximity. No long commutes, no wasted time.', color: '#DC2626', bg: '#FEE2E2' },
];

const FEATURED_JOBS = [
  { title: '2 Cleaners Needed',    location: 'Kololo, Kampala',    pay: '80,000',   urgency: 'Today',    icon: Sparkles,  color: '#059669', bg: '#ECFDF5', applied: 3  },
  { title: 'Plumber for Bathroom', location: 'Ntinda, Kampala',    pay: '120,000',  urgency: 'Urgent',   icon: Droplets,  color: '#0369A1', bg: '#DBEAFE', applied: 1  },
  { title: 'Driver — Entebbe Run', location: 'Entebbe Road',       pay: '60,000',   urgency: 'Tomorrow', icon: Car,       color: '#0F172A', bg: '#F1F5F9', applied: 7  },
  { title: 'Event Staff × 5',      location: 'Munyonyo, Kampala',  pay: '50,000',   urgency: 'Weekend',  icon: Calendar,  color: '#9333EA', bg: '#F3E8FF', applied: 12 },
];

const TESTIMONIALS = [
  { name: 'Nakato Sarah',   role: 'Cleaner · Kampala', quote: 'I found 4 cleaning jobs in my first week. I now have 3 regular weekly clients and earn more than I ever did before.', rating: 5, featured: true },
  { name: 'Ssemwanga Paul', role: 'Employer · Ntinda',  quote: 'Hired a plumber and painter within 30 minutes. Both arrived on time and did excellent work. Will use TUKOLA again.', rating: 5, featured: false },
  { name: 'Atim Grace',     role: 'Cook · Gulu',        quote: 'TUKOLA turned my catering side hustle into a full business. I now have 5 people working under me.', rating: 5, featured: false },
];

const STATS = [
  { value: 10000, suffix: '+', label: 'Active Workers' },
  { value: 2000, suffix: '+', label: 'Employers' },
  { value: 50000, suffix: '+', label: 'Jobs Completed' },
  { value: 49, prefix: '', suffix: '★', label: 'Average Rating', isDecimal: true },
];

function AnimatedSection({ children, animation = 'slideUp', delay = 0, className = '' }: { children: React.ReactNode; animation?: AnimationType; delay?: number; className?: string }) {
  const { ref, isVisible } = useScrollAnimation();
  const delayStyle = delay > 0 ? { transitionDelay: `${delay}ms` } : {};
  return (
    <div ref={ref} className={`${getScrollAnimationClasses(isVisible, animation)} ${className}`} style={delayStyle}>
      {children}
    </div>
  );
}

function AnimatedCounter({ end, suffix = '', prefix = '', duration = 2500, isDecimal = false }: { end: number; suffix?: string; prefix?: string; duration?: number; isDecimal?: boolean }) {
  const { ref, count } = useCountUp(end, duration);
  const display = isDecimal ? `${(count / 10).toFixed(1)}` : count.toLocaleString();
  return (
    <span ref={ref} className="counter-number">
      {prefix}{display}{suffix}
    </span>
  );
}

function MagneticButton({ children, className = '', style, onClick, href }: { children: React.ReactNode; className?: string; style?: React.CSSProperties; onClick?: () => void; href?: string }) {
  const { ref, position, handleMouseMove, handleMouseLeave } = useMagneticEffect();
  const mergedStyle = { ...style, transform: `translate(${position.x}px, ${position.y}px)` };
  const onMouseMoveHandler = handleMouseMove as unknown as React.MouseEventHandler<HTMLElement>;
  const onMouseLeaveHandler = handleMouseLeave as unknown as React.MouseEventHandler<HTMLElement>;

  if (href) {
    return (
      <Link href={href} className={className} style={mergedStyle} onMouseMove={onMouseMoveHandler} onMouseLeave={onMouseLeaveHandler} ref={ref as any}>
        {children}
      </Link>
    );
  }
  return (
    <button className={className} style={mergedStyle} onMouseMove={onMouseMoveHandler} onMouseLeave={onMouseLeaveHandler} ref={ref as any} onClick={onClick}>
      {children}
    </button>
  );
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const scrollProgress = useScrollProgress();
  const { ref: parallaxRef, offset } = useParallax(0.3);

  const { ref: servicesRef, isVisible: servicesVisible, getStaggerClasses } = useStaggerAnimation(SERVICE_ICONS.length, 80);
  const { ref: whyRef, isVisible: whyVisible, getStaggerClasses: getWhyStagger } = useStaggerAnimation(WHY_ITEMS.length, 120);
  const { ref: jobsRef, isVisible: jobsVisible, getStaggerClasses: getJobsStagger } = useStaggerAnimation(FEATURED_JOBS.length, 100);
  const { ref: testimonialsRef, isVisible: testimonialsVisible, getStaggerClasses: getTestimonialStagger } = useStaggerAnimation(TESTIMONIALS.length, 150);

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'var(--font-jakarta)' }}>

      {/* Custom Cursor Glow */}
      <CustomCursor />

      {/* Floating orbs - ambient background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="floating-orb w-[500px] h-[500px] bg-[#2952E8]/20" style={{ top: '10%', left: '-10%', animationDelay: '0s' }} />
        <div className="floating-orb w-[400px] h-[400px] bg-[#00C8FF]/15" style={{ top: '40%', right: '-5%', animationDelay: '5s' }} />
        <div className="floating-orb w-[300px] h-[300px] bg-[#1A2DB8]/20" style={{ bottom: '20%', left: '20%', animationDelay: '10s' }} />
      </div>

      {/* Scroll Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-[60] h-0.5 bg-transparent">
        <div className="h-full bg-gradient-to-r from-[#00C8FF] via-[#2952E8] to-[#1A2DB8] transition-all duration-150 ease-out"
          style={{ width: `${scrollProgress * 100}%` }} />
      </div>

      {/* ══ NAVBAR ══════════════════════════════════════════ */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-[#2952E8]/8 shadow-[0_2px_20px_rgba(41,82,232,0.06)]">
        <div className="max-w-6xl mx-auto px-4 lg:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0 group">
            <div className="animate-logo-glow">
              <TukolaLogo variant="full" size="md" />
            </div>
          </Link>
          <div className="hidden lg:flex items-center gap-8 text-sm font-semibold text-gray-500">
            <a href="#services" className="hover:text-[#2952E8] transition-colors py-2 relative after:absolute after:bottom-0 after:left-0 after:w-0 hover:after:w-full after:h-0.5 after:bg-[#2952E8] after:transition-all">Services</a>
            <a href="#how" className="hover:text-[#2952E8] transition-colors py-2 relative after:absolute after:bottom-0 after:left-0 after:w-0 hover:after:w-full after:h-0.5 after:bg-[#2952E8] after:transition-all">How it Works</a>
            <a href="#download" className="hover:text-[#2952E8] transition-colors py-2 relative after:absolute after:bottom-0 after:left-0 after:w-0 hover:after:w-full after:h-0.5 after:bg-[#2952E8] after:transition-all">Get the App</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden sm:block text-sm font-semibold text-[#2952E8] px-4 py-2 rounded-lg hover:bg-blue-50/80 transition-colors">Sign In</Link>
            <MagneticButton href="/onboarding" className="text-sm font-bold text-white px-5 py-2.5 rounded-lg transition-all hover:opacity-90 hover:shadow-lg btn-scale"
              style={{ background: 'linear-gradient(135deg, #2952E8, #1A2DB8)' }}>
              Get Started
            </MagneticButton>
            <button onClick={() => setMenuOpen(v => !v)} className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors ml-1">
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="lg:hidden border-t border-gray-100 bg-white/95 backdrop-blur-xl px-4 py-4 flex flex-col gap-1 text-sm font-semibold text-gray-700 shadow-lg animate-slide-up">
            <a href="#services" onClick={() => setMenuOpen(false)} className="py-3 border-b border-gray-50 hover:text-[#2952E8] transition-colors">Services</a>
            <a href="#how" onClick={() => setMenuOpen(false)} className="py-3 border-b border-gray-50 hover:text-[#2952E8] transition-colors">How it Works</a>
            <a href="#download" onClick={() => setMenuOpen(false)} className="py-3 border-b border-gray-50 hover:text-[#2952E8] transition-colors">Get the App</a>
            <Link href="/login" onClick={() => setMenuOpen(false)} className="py-3 text-[#2952E8]">Sign In</Link>
          </div>
        )}
      </nav>

      {/* ══ HERO SLIDER ══════════════════════════════════════ */}
      <HeroSlider />

      {/* ══ HERO LOGO REVEAL ═════════════════════════════════ */}
      <AnimatedSection animation="fadeIn">
        <section className="py-20 lg:py-28 px-4 bg-white relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.03] pointer-events-none" style={{ background: 'radial-gradient(circle, #2952E8, transparent)' }} />
          <div className="max-w-3xl mx-auto text-center relative z-10">
            <div className="animate-logo-reveal mb-6">
              <TukolaLogo variant="full" size="lg" />
            </div>
            <h2 className="text-xl lg:text-3xl font-black text-[#0A0F2C] mb-4 leading-tight">
              Uganda&apos;s #1 <span className="text-gradient">blue-collar</span> gig marketplace
            </h2>
            <p className="text-gray-500 text-sm lg:text-base leading-relaxed max-w-lg mx-auto mb-8">
              Connecting skilled workers with employers across Uganda. From cleaners to construction workers, find or post any gig in minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <MagneticButton href="/onboarding" className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-white font-bold text-sm btn-scale"
                style={{ background: 'linear-gradient(135deg, #2952E8, #1A2DB8)', boxShadow: '0 4px 20px rgba(41,82,232,0.4)' }}>
                Start Finding Work <ArrowRight size={15} />
              </MagneticButton>
              <MagneticButton href="/onboarding" className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-bold text-[#2952E8] text-sm border-2 border-[#2952E8]/20 hover:border-[#2952E8]/40 hover:bg-blue-50/50 transition-all btn-scale">
                Post a Job <ArrowRight size={15} />
              </MagneticButton>
            </div>
          </div>
        </section>
      </AnimatedSection>

      {/* ══ STATS BAR ════════════════════════════════════════ */}
      <div style={{ background: 'linear-gradient(90deg,#1A2DB8,#2952E8,#00C8FF)' }} className="py-8 lg:py-10 px-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ background: 'radial-gradient(circle at 30% 50%, rgba(255,255,255,0.3), transparent 50%)' }} />
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-white/15 text-center relative z-10">
          {STATS.map((s, i) => (
            <div key={s.label} className="px-3 py-3 sm:py-0">
              <div className="text-2xl lg:text-3xl font-black text-white mb-1">
                <AnimatedCounter
                  end={s.value}
                  suffix={s.suffix}
                  prefix={s.prefix}
                  isDecimal={s.isDecimal}
                  duration={2000 + i * 300}
                />
              </div>
              <div className="text-blue-200/70 text-[11px] font-semibold uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ TICKER ══════════════════════════════════════════ */}
      <div className="overflow-hidden bg-[#060B1F] py-2.5" aria-hidden>
        <div className="flex gap-10 whitespace-nowrap" style={{ animation: 'ticker 45s linear infinite' }}>
          {[...SKILL_OPTIONS, ...SKILL_OPTIONS].map((s, i) => (
            <span key={i} className="text-white/30 text-[11px] font-bold uppercase tracking-widest flex-shrink-0">· {s}</span>
          ))}
        </div>
      </div>

      {/* ══ TRUSTED BY MARQUEE ═══════════════════════════════ */}
      <AnimatedSection animation="fadeIn">
        <section className="py-10 lg:py-14 px-4 bg-white border-b border-gray-100">
          <div className="max-w-6xl mx-auto">
            <p className="text-center text-gray-400 text-xs font-bold uppercase tracking-widest mb-8">Trusted by workers and employers across Uganda</p>
            <div className="overflow-hidden relative">
              <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-white to-transparent z-10" />
              <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-white to-transparent z-10" />
              <div className="flex gap-16 animate-marquee" style={{ width: 'max-content' }}>
                {[...Array(2)].map((_, set) => (
                  <div key={set} className="flex gap-16 items-center">
                    {['Kampala City Council', 'SafeBoda', 'MTN Uganda', 'Airtel', 'Jumia', 'Uber', 'Bolt', 'Shell'].map((name) => (
                      <div key={`${set}-${name}`} className="flex items-center gap-2 text-gray-300 hover:text-gray-500 transition-colors whitespace-nowrap">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2952E8]/10 to-[#00C8FF]/10 flex items-center justify-center">
                          <span className="text-[#2952E8] font-black text-xs">{name.charAt(0)}</span>
                        </div>
                        <span className="font-bold text-sm tracking-tight">{name}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </AnimatedSection>

      <div className="section-divider" />

      {/* ══ SERVICE CATEGORIES ═══════════════════════════════ */}
      <AnimatedSection animation="slideUp">
        <section id="services" className="py-16 lg:py-24 px-4 lg:px-8 bg-white relative">
          <div className="absolute top-0 left-0 right-0 h-32 shade-gradient-overlay pointer-events-none" />
          <div className="max-w-6xl mx-auto relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-3">
              <div>
                <p className="text-[#2952E8] font-bold text-xs uppercase tracking-widest mb-2">Browse Services</p>
                <h2 className="text-2xl lg:text-4xl font-black text-[#0A0F2C]">What do you need done?</h2>
              </div>
              <Link href="/onboarding" className="text-sm font-bold text-[#2952E8] flex items-center gap-1 group hover:gap-2 transition-all">
                All services <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
            <div ref={servicesRef} className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3 lg:gap-4">
              {SERVICE_ICONS.map(({ label, icon: Icon, color, bg }, i) => (
                <Link href="/onboarding" key={label}>
                  <div className="group flex flex-col items-center gap-2.5 py-4 px-2 rounded-2xl hover:bg-gray-50 transition-all cursor-pointer active:scale-95"
                    style={getStaggerClasses(i)}>
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:shadow-lg transition-all duration-300"
                      style={{ background: bg }}>
                      <Icon size={24} color={color} strokeWidth={1.8} />
                    </div>
                    <span className="text-[11px] font-semibold text-center text-gray-600 leading-tight">{label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </AnimatedSection>

      <div className="section-divider" />

      {/* ══ LIVE JOBS PREVIEW ════════════════════════════════ */}
      <AnimatedSection animation="slideUp" delay={100}>
        <section className="py-16 lg:py-24 px-4 lg:px-8" style={{ background: '#F7F9FF' }}>
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-3">
              <div>
                <p className="text-[#2952E8] font-bold text-xs uppercase tracking-widest mb-2">Live on Platform</p>
                <h2 className="text-2xl lg:text-4xl font-black text-[#0A0F2C]">Jobs posted today</h2>
              </div>
              <Link href="/onboarding" className="text-sm font-bold text-[#2952E8] flex items-center gap-1 group hover:gap-2 transition-all">
                See all jobs <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
            <div ref={jobsRef} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 perspective-1000">
              {FEATURED_JOBS.map((job, i) => {
                const Icon = job.icon;
                return (
                  <Link href="/onboarding" key={job.title}>
                    <div className="tilt-card bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 cursor-pointer h-full group"
                      style={getJobsStagger(i)}>
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300" style={{ background: job.bg }}>
                          <Icon size={20} color={job.color} strokeWidth={1.8} />
                        </div>
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                          style={{ background: job.urgency === 'Urgent' ? '#FEE2E2' : '#F0F4FF', color: job.urgency === 'Urgent' ? '#DC2626' : '#2952E8' }}>
                          {job.urgency}
                        </span>
                      </div>
                      <h3 className="font-bold text-[#0A0F2C] text-sm mb-1.5 leading-snug group-hover:text-[#2952E8] transition-colors">{job.title}</h3>
                      <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-4">
                        <MapPin size={11} strokeWidth={2} />
                        {job.location}
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                        <span className="font-black text-[#2952E8] text-sm">UGX {job.pay}</span>
                        <span className="text-gray-400 text-[10px] flex items-center gap-1">
                          <Users size={10} /> {job.applied} applied
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
            <div className="mt-8 text-center">
              <MagneticButton href="/onboarding" className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-white text-sm font-bold btn-scale"
                style={{ background: 'linear-gradient(135deg, #2952E8, #1A2DB8)', boxShadow: '0 4px 20px rgba(41,82,232,0.4)' }}>
                Apply to Jobs Free <ArrowRight size={15} />
              </MagneticButton>
            </div>
          </div>
        </section>
      </AnimatedSection>

      <div className="section-divider" />

      {/* ══ HOW IT WORKS ═════════════════════════════════════ */}
      <AnimatedSection animation="slideUp">
        <section id="how" className="py-16 lg:py-24 px-4 lg:px-8 bg-white relative">
          <div className="absolute bottom-0 left-0 right-0 h-24 shade-gradient-overlay pointer-events-none" />
          <div className="max-w-5xl mx-auto relative z-10">
            <div className="text-center mb-16">
              <p className="text-[#2952E8] font-bold text-xs uppercase tracking-widest mb-2">Simple Process</p>
              <h2 className="text-2xl lg:text-4xl font-black text-[#0A0F2C]">Up and running in 3 steps</h2>
            </div>
            <div className="relative grid md:grid-cols-3 gap-8 lg:gap-10">
              <div className="hidden md:block absolute top-12 left-[calc(16.66%+2rem)] right-[calc(16.66%+2rem)] h-0.5 overflow-hidden rounded-full">
                <div className="h-full w-full" style={{ background: 'linear-gradient(90deg, transparent, #D1D9FF 20%, #D1D9FF 80%, transparent)' }}>
                  <div className="h-full w-full animate-shimmer-line" style={{ background: 'linear-gradient(90deg, transparent, rgba(41,82,232,0.6), transparent)', backgroundSize: '200% 100%', animation: 'shimmerLine 3s ease-in-out infinite' }} />
                </div>
              </div>
              {STEPS.map((s, i) => {
                const Icon = s.icon;
                const anim = i === 0 ? 'slideLeft' : i === 2 ? 'slideRight' : 'scaleUp';
                return (
                  <AnimatedSection key={s.n} animation={anim} delay={i * 200}>
                    <div className="relative flex flex-col items-center text-center group">
                      <div className="relative mb-6">
                        <div className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all duration-300"
                          style={{ background: i === 1 ? 'linear-gradient(135deg,#2952E8,#1A2DB8)' : '#F0F4FF' }}>
                          <Icon size={32} color={i === 1 ? '#fff' : '#2952E8'} strokeWidth={1.6} />
                        </div>
                        <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-lg"
                          style={{ background: '#2952E8' }}>{s.n}</span>
                      </div>
                      <h3 className="font-black text-[#0A0F2C] text-base mb-2">{s.title}</h3>
                      <p className="text-gray-500 text-sm leading-relaxed mb-4">{s.desc}</p>
                      <span className="text-[10px] font-bold px-3 py-1.5 rounded-full" style={{ background: '#EEF2FF', color: '#2952E8' }}>{s.tag}</span>
                    </div>
                  </AnimatedSection>
                );
              })}
            </div>
            <div className="mt-14 text-center">
              <MagneticButton href="/onboarding" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-white font-bold text-sm btn-scale"
                style={{ background: 'linear-gradient(135deg,#2952E8,#1A2DB8)', boxShadow: '0 6px 24px rgba(41,82,232,0.35)' }}>
                Get Started Free — It Only Takes 60s <ArrowRight size={16} />
              </MagneticButton>
            </div>
          </div>
        </section>
      </AnimatedSection>

      <div className="section-divider" />

      {/* ══ WHY TUKOLA ═══════════════════════════════════════ */}
      <AnimatedSection animation="fadeIn" delay={100}>
        <section className="py-16 lg:py-24 px-4 lg:px-8" style={{ background: '#F7F9FF' }}>
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <p className="text-[#2952E8] font-bold text-xs uppercase tracking-widest mb-2">Why Choose Us</p>
              <h2 className="text-2xl lg:text-4xl font-black text-[#0A0F2C]">Built for Uganda&apos;s workforce</h2>
            </div>
            <div ref={whyRef} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {WHY_ITEMS.map(({ icon: Icon, title, desc, color, bg }, i) => (
                <div key={title} className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group"
                  style={getWhyStagger(i)}>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300" style={{ background: bg }}>
                    <Icon size={22} color={color} strokeWidth={1.8} />
                  </div>
                  <h3 className="font-black text-[#0A0F2C] text-sm mb-2">{title}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </AnimatedSection>

      <div className="section-divider" />

      {/* ══ WORKERS / EMPLOYERS ══════════════════════════════ */}
      <section className="py-16 lg:py-24 px-4 lg:px-8 bg-white relative overflow-hidden" ref={parallaxRef}>
        <div className="absolute top-0 left-0 w-full h-32 shade-gradient-overlay pointer-events-none" />
        <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full opacity-5 pointer-events-none" style={{ background: 'radial-gradient(circle, #2952E8, transparent)', transform: `translateY(${offset}px)` }} />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full opacity-5 pointer-events-none" style={{ background: 'radial-gradient(circle, #00C8FF, transparent)', transform: `translateY(${-offset * 0.5}px)` }} />
        <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-6 relative z-10">
          <AnimatedSection animation="slideLeft">
            <div className="rounded-3xl overflow-hidden relative group" style={{ minHeight: 400, background: 'linear-gradient(140deg,#1A2DB8,#2952E8)' }}>
              <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity duration-500">
                <Image src="/images/slide-2.jpg" alt="Workers" fill sizes="100vw" style={{ objectFit: 'cover' }} />
              </div>
              <div className="absolute inset-0 shade-gradient-overlay" />
              <div className="relative z-10 p-8 lg:p-10 flex flex-col h-full justify-between" style={{ minHeight: 400 }}>
                <div>
                  <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-200 mb-4">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    For Workers
                  </span>
                  <h2 className="text-2xl lg:text-3xl font-black text-white mb-3 leading-tight">Find work today.<br />Get paid tomorrow.</h2>
                  <p className="text-blue-200/80 text-sm mb-6 leading-relaxed">Browse hundreds of gigs in your area. No CV needed — just show up and do great work.</p>
                  <div className="space-y-3 mb-6">
                    {['Browse jobs nearby & apply in 1 tap','Daily & weekly pay options','Build ratings and earn more over time'].map(t => (
                      <div key={t} className="flex items-center gap-3 text-white/90 text-sm">
                        <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                          <Check size={10} color="white" strokeWidth={3} />
                        </div>
                        {t}
                      </div>
                    ))}
                  </div>
                </div>
                <MagneticButton href="/onboarding" className="flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-[#2952E8] text-sm bg-white hover:bg-white/95 transition-all btn-scale w-full">
                  Find Jobs Now <ArrowRight size={15} />
                </MagneticButton>
              </div>
            </div>
          </AnimatedSection>

          <AnimatedSection animation="slideRight">
            <div className="rounded-3xl overflow-hidden relative group" style={{ minHeight: 400, background: 'linear-gradient(140deg,#0A3D5C,#0369A1)' }}>
              <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity duration-500">
                <Image src="/images/slide-5.jpg" alt="Employers" fill sizes="100vw" style={{ objectFit: 'cover' }} />
              </div>
              <div className="absolute inset-0 shade-gradient-overlay" />
              <div className="relative z-10 p-8 lg:p-10 flex flex-col h-full justify-between" style={{ minHeight: 400 }}>
                <div>
                  <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-cyan-200 mb-4">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    For Employers
                  </span>
                  <h2 className="text-2xl lg:text-3xl font-black text-white mb-3 leading-tight">Hire in minutes.<br />Not days.</h2>
                  <p className="text-cyan-100/80 text-sm mb-6 leading-relaxed">Post a job in 60 seconds. Get matched with verified, rated workers near you instantly.</p>
                  <div className="space-y-3 mb-6">
                    {['Post a job in under 1 minute','Matched with top-rated workers nearby','Track & manage all jobs in one place'].map(t => (
                      <div key={t} className="flex items-center gap-3 text-white/90 text-sm">
                        <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                          <Check size={10} color="white" strokeWidth={3} />
                        </div>
                        {t}
                      </div>
                    ))}
                  </div>
                </div>
                <MagneticButton href="/onboarding" className="flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white text-sm w-full border-2 border-white/40 hover:bg-white/10 hover:border-white/60 transition-all btn-scale">
                  Post a Job Free <ArrowRight size={15} />
                </MagneticButton>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      <div className="section-divider" />

      {/* ══ TESTIMONIALS ═════════════════════════════════════ */}
      <AnimatedSection animation="fadeIn">
        <section className="py-16 lg:py-24 px-4 lg:px-8" style={{ background: '#F7F9FF' }}>
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <p className="text-[#2952E8] font-bold text-xs uppercase tracking-widest mb-2">Real Stories</p>
              <h2 className="text-2xl lg:text-4xl font-black text-[#0A0F2C]">Trusted by thousands across Uganda</h2>
            </div>
            <div ref={testimonialsRef} className="grid lg:grid-cols-3 gap-5">
              {TESTIMONIALS.map((t, i) => (
                <div key={t.name} className={`rounded-2xl p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${t.featured ? 'lg:row-span-1' : ''}`}
                  style={{ ...getTestimonialStagger(i), background: t.featured ? 'linear-gradient(135deg,#2952E8,#1A2DB8)' : '#fff', border: t.featured ? 'none' : '1px solid #E5E7EB' }}>
                  <Quote size={28} className="mb-3 opacity-40" color={t.featured ? '#fff' : '#2952E8'} />
                  <div className="flex gap-0.5 mb-3">
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <Star key={j} size={13} fill={t.featured ? '#FCD34D' : '#F59E0B'} color={t.featured ? '#FCD34D' : '#F59E0B'} />
                    ))}
                  </div>
                  <p className={`text-sm leading-relaxed mb-5 ${t.featured ? 'text-white/90' : 'text-gray-700'}`}>&ldquo;{t.quote}&rdquo;</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
                      style={{ background: t.featured ? 'rgba(255,255,255,0.2)' : '#EEF2FF', color: t.featured ? '#fff' : '#2952E8' }}>
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <div className={`font-bold text-sm ${t.featured ? 'text-white' : 'text-[#0A0F2C]'}`}>{t.name}</div>
                      <div className={`text-xs ${t.featured ? 'text-white/60' : 'text-gray-400'}`}>{t.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </AnimatedSection>

      <div className="section-divider" />

      {/* ══ CTA BANNER ═══════════════════════════════════════ */}
      <AnimatedSection animation="fadeIn">
        <section className="py-16 lg:py-24 px-4 lg:px-8 bg-white relative overflow-hidden">
          <div className="max-w-4xl mx-auto rounded-3xl overflow-hidden relative animate-glow-pulse" style={{ background: 'linear-gradient(135deg,#00C8FF 0%,#2952E8 50%,#1A2DB8 100%)' }}>
            <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full opacity-20" style={{ background: 'radial-gradient(circle,#fff,transparent)' }} />
            <div className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full opacity-15" style={{ background: 'radial-gradient(circle,#00C8FF,transparent)' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-5" style={{ background: 'radial-gradient(circle, white, transparent)' }} />
            <div className="relative z-10 p-10 lg:p-14 flex flex-col lg:flex-row items-center gap-8 text-center lg:text-left">
              <div className="flex-1">
                <h2 className="text-2xl lg:text-4xl font-black text-white mb-3">Ready to get started?</h2>
                <p className="text-white/70 text-base leading-relaxed">Join 10,000+ Ugandans already finding work and hiring on TUKOLA. Free forever.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
                <MagneticButton href="/onboarding" className="flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-black text-[#2952E8] text-sm bg-white hover:shadow-xl transition-all btn-scale">
                  Find Work <ArrowRight size={15} />
                </MagneticButton>
                <MagneticButton href="/onboarding" className="flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-bold text-white text-sm border-2 border-white/40 hover:bg-white/10 transition-all btn-scale">
                  Hire Workers <ArrowRight size={15} />
                </MagneticButton>
              </div>
            </div>
          </div>
        </section>
      </AnimatedSection>

      <div className="section-divider" />

      {/* ══ APP DOWNLOAD ═════════════════════════════════════ */}
      <AnimatedSection animation="slideUp">
        <section id="download" className="py-20 lg:py-28 px-4 lg:px-8 bg-[#060B1F] relative overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full opacity-10 pointer-events-none" style={{ background: 'radial-gradient(circle, #2952E8, transparent)' }} />
          <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full opacity-10 pointer-events-none" style={{ background: 'radial-gradient(circle, #00C8FF, transparent)' }} />
          <div className="absolute top-0 left-0 right-0 h-40 shade-gradient-overlay pointer-events-none" />

          <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-16 relative z-10">
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full border border-blue-500/20 bg-blue-500/10">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-blue-400 font-bold text-xs uppercase tracking-widest">Mobile App</span>
              </div>
              <h2 className="text-3xl lg:text-5xl font-black text-white mb-4 leading-tight">
                Take TUKOLA<br />everywhere
              </h2>
              <p className="text-gray-400 text-base mb-8 leading-relaxed max-w-md mx-auto lg:mx-0">Instant job alerts, one-tap apply, and real-time chat — all from your pocket. Available on Android and coming soon to iOS.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-5">
                <a href="#" className="group flex items-center gap-3 px-6 py-3.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 hover:scale-105 transition-all duration-300">
                  <Download size={22} className="text-white group-hover:text-[#00C8FF] transition-colors" />
                  <div className="text-left">
                    <div className="text-white/50 text-[10px] font-semibold uppercase tracking-wide">Download on</div>
                    <div className="text-white font-bold text-sm">Google Play</div>
                  </div>
                </a>
                <a href="#" className="group flex items-center gap-3 px-6 py-3.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 hover:scale-105 transition-all duration-300">
                  <Smartphone size={22} className="text-white group-hover:text-[#00C8FF] transition-colors" />
                  <div className="text-left">
                    <div className="text-white/50 text-[10px] font-semibold uppercase tracking-wide">Coming to</div>
                    <div className="text-white font-bold text-sm">App Store</div>
                  </div>
                </a>
              </div>
              <p className="text-gray-600 text-xs">Or use the web version — works on any device, no download needed.</p>
            </div>

            <div className="flex gap-6 lg:gap-8 flex-shrink-0 perspective-1000 items-center justify-center">
              {[
                {bg:'linear-gradient(160deg,#00C8FF,#2952E8,#1A2DB8)', items:['Cleaner · Kampala','Driver · Entebbe','Builder · Jinja'], label:'Find Jobs', dark: true, delay: '0s'},
                {bg:'#F7F9FF', items:['Post Plumber','Event Staff','Security Guard'], label:'Hire Workers', dark: false, delay: '1s'},
              ].map((p, pi) => (
                <div key={pi} className={`phone-mockup-3d animate-float-3d ${pi === 1 ? 'mt-8 lg:mt-12' : ''}`}
                  style={{ animationDelay: p.delay, width: pi === 0 ? 240 : 220, aspectRatio: '9/19', borderRadius: '2.5rem', border: pi === 0 ? '4px solid rgba(255,255,255,0.15)' : '4px solid #E5E7EB', overflow: 'hidden', flexShrink: 0 }}>
                  <div className="w-full h-full flex flex-col p-5 lg:p-6" style={{ background: p.bg }}>
                    <div className="flex items-center gap-2 mb-4">
                      <TukolaLogo variant="mark" size="sm" />
                      <span className={`text-[10px] font-bold uppercase tracking-wide ${p.dark ? 'text-white/60' : 'text-[#2952E8]'}`}>{p.label}</span>
                    </div>
                    <div className="space-y-3 flex-1">
                      {p.items.map(j => (
                        <div key={j} className="rounded-xl px-3 py-2.5 text-[10px] font-semibold"
                          style={{ background: p.dark ? 'rgba(255,255,255,0.13)' : '#fff', color: p.dark ? '#fff' : '#2952E8', border: p.dark ? 'none' : '1px solid #E2E8FF' }}>
                          {j}
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 py-2.5 rounded-xl text-center text-[10px] font-bold"
                      style={{ background: p.dark ? 'rgba(255,255,255,0.2)' : '#2952E8', color: '#fff' }}>
                      {p.dark ? 'Apply Now' : 'Post a Job'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </AnimatedSection>

      <div className="section-divider" />

      {/* ══ FOOTER ═══════════════════════════════════════════ */}
      <AnimatedSection animation="slideUp">
        <footer className="bg-[#03060F] py-12 lg:py-16 px-4 lg:px-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-32 shade-gradient-overlay pointer-events-none" />
          <div className="max-w-6xl mx-auto relative z-10">
            <div className="flex flex-col lg:flex-row justify-between gap-10 mb-10">
              <div className="max-w-xs">
                <div className="flex items-center gap-2 mb-4 animate-logo-glow">
                  <TukolaLogo variant="mark" size="sm" />
                  <TukolaLogo variant="wordmark" size="sm" onDark={true} />
                </div>
                <p className="text-gray-500 text-sm leading-relaxed">Uganda&apos;s blue-collar gig marketplace. Connecting skilled workers with employers across the country.</p>
              </div>
              <div className="flex flex-wrap gap-12 lg:gap-16">
                <div>
                  <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4">Platform</div>
                  <div className="space-y-3">
                    {[['Find Jobs','/onboarding'],['Hire Workers','/onboarding'],['Sign In','/login'],['Register','/onboarding']].map(([l, h]) => (
                      <Link key={l} href={h} className="block text-gray-500 text-sm hover:text-white transition-colors">{l}</Link>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4">Top Services</div>
                  <div className="space-y-3">
                    {['Cleaning','Plumbing','Driving','Cooking','Security','Building'].map(s => (
                      <Link key={s} href="/onboarding" className="block text-gray-500 text-sm hover:text-white transition-colors">{s}</Link>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4">Company</div>
                  <div className="space-y-3">
                    {['About','Careers','Blog','Contact'].map(s => (
                      <span key={s} className="block text-gray-500 text-sm hover:text-white transition-colors cursor-pointer">{s}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t border-white/5 pt-7 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-gray-600 text-xs">&copy; 2024 TUKOLA Uganda Limited. All rights reserved.</p>
              <p className="text-gray-600 text-xs flex items-center gap-1">Made with care in Kampala</p>
            </div>
          </div>
        </footer>
      </AnimatedSection>

      {/* Back to Top */}
      <BackToTop />
    </div>
  );
}
