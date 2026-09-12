'use client';

import { useState, useEffect, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

const slides = [
  {
    badge: "Every payment held in escrow",
    headline: "Find Skilled Workers Fast",
    subtitle: "Post a job and connect with rated fundis in your area.",
    image: '/images/opt/slide-1.webp',
    position: 'center 30%',
  },
  {
    badge: "Rated after every completed job",
    headline: "Grow Your Business with Trusted Talent",
    subtitle: "Fundi ratings are earned on real jobs — never bought, never invented.",
    image: '/images/opt/slide-2.webp',
    position: 'center 40%',
  },
  {
    badge: "Phone-verified accounts only",
    headline: "Real People, Real Profiles",
    subtitle: "Every account is verified by SMS code — no anonymous strangers.",
    image: '/images/opt/slide-3.webp',
    position: 'center 15%',
  },
  {
    badge: "Post a job in under 2 minutes",
    headline: "Hire in Under 5 Minutes",
    subtitle: "Post a job, review applicants, and hire with total confidence.",
    image: '/images/opt/slide-4.webp',
    position: 'center 78%',
  },
  {
    badge: "Tukola Guarantee on escrowed jobs",
    headline: "Quality Work, Protected",
    subtitle: "Money stays in escrow until you confirm the job is done.",
    image: '/images/opt/slide-5.webp',
    position: 'center 20%',
  },
  {
    badge: "Starting in Greater Kampala",
    headline: "Built for Uganda",
    subtitle: "Made for Kampala's fundis and the people who hire them.",
    image: '/images/opt/slide-6.webp',
    position: 'center 35%',
  },
  {
    badge: "Earn on your own schedule",
    headline: "Get Paid for Your Skills",
    subtitle: "Set your own hours, choose your jobs, get paid on release — guaranteed.",
    image: '/images/opt/slide-7.webp',
    position: 'center 45%',
  },
  {
    badge: "Re-book your favourite fundi in one tap",
    headline: "Your Next Opportunity Awaits",
    subtitle: "Found a great fundi? Bring them back with a single tap.",
    image: '/images/opt/slide-8.webp',
    position: 'center 30%',
  },
];

const pills = ["Cleaner", "Plumber", "Driver", "Electrician", "Cook"];

export default function HeroSlider() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { scrollY } = useScroll();
  const yOffset = useTransform(scrollY, [0, 1000], [0, 200]);

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((index: number) => emblaApi && emblaApi.scrollTo(index), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
  }, [emblaApi, onSelect]);

  useEffect(() => {
    const autoplay = setInterval(() => {
      if (emblaApi) emblaApi.scrollNext();
    }, 6000);
    return () => clearInterval(autoplay);
  }, [emblaApi]);

  return (
    <div className="relative w-full h-[680px] md:h-[700px] overflow-hidden bg-navy text-white">
      <motion.div style={{ y: yOffset }} className="absolute inset-[-10%] w-[120%] h-[120%] z-0" ref={emblaRef}>
        <div className="flex h-full">
          {slides.map((slide, index) => (
            <div
              key={index}
              className="flex-[0_0_100%] h-full relative overflow-hidden"
            >
              <div
                className={`absolute inset-0 ${selectedIndex === index ? 'animate-ken-burns' : ''}`}
                style={{
                  backgroundImage: `url(${slide.image})`,
                  backgroundSize: 'cover',
                  backgroundPosition: slide.position,
                  backgroundRepeat: 'no-repeat',
                }}
              />

              {/* Dual Overlays */}
              <div className="absolute inset-0 bg-gradient-to-tr from-[#060b1f]/90 via-[#060b1f]/40 to-transparent z-10" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)] z-10" />
            </div>
          ))}
        </div>
      </motion.div>

      <div className="absolute inset-0 z-20 flex items-center pt-20 pb-24">
        <div className="container mx-auto px-4 md:px-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedIndex}
              className="max-w-3xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 rounded-full mb-6"
              >
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-sm font-medium">{slides[selectedIndex].badge}</span>
              </motion.div>

              <motion.h1
                initial={{ clipPath: 'inset(0 0 100% 0)' }}
                animate={{ clipPath: 'inset(0 0 0% 0)' }}
                transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
                className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold font-heading leading-tight mb-6 text-white"
              >
                {slides[selectedIndex].headline}
              </motion.h1>

              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.6 }}
                className="text-lg md:text-xl text-gray-200 mb-8 max-w-2xl leading-relaxed"
              >
                {slides[selectedIndex].subtitle}
              </motion.p>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.6 }}
                className="w-full max-w-xl"
              >
                <form
                  className="flex flex-col sm:flex-row gap-3 bg-white p-2 rounded-2xl shadow-xl mb-6"
                  onSubmit={(e) => {
                    e.preventDefault();
                    // Hand the query to the app: after login, the employer
                    // home's services marketplace opens pre-searched with
                    // exactly what the visitor typed here.
                    try {
                      if (query.trim()) localStorage.setItem('kola_search_query', query.trim());
                    } catch {}
                    router.push('/login');
                  }}
                >
                  <div className="flex-1 flex items-center px-4 py-2 border-b sm:border-b-0 sm:border-r border-gray-100">
                    <Search className="text-gray-400 w-5 h-5 mr-3 shrink-0" aria-hidden="true" />
                    <label htmlFor="hero-search" className="sr-only">What service do you need?</label>
                    <input
                      id="hero-search"
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="What service do you need?"
                      className="w-full bg-transparent text-gray-900 focus:outline-none placeholder-gray-400"
                    />
                  </div>
                  <button type="submit" className="btn-gradient px-8 py-4 rounded-xl whitespace-nowrap text-[15px]">
                    Find a Fundi
                  </button>
                </form>

                <div className="flex items-center gap-2.5 flex-nowrap overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1 sm:flex-wrap sm:overflow-visible">
                  <span className="text-sm text-gray-300 font-medium shrink-0">Popular:</span>
                  {pills.map((pill) => (
                    <button
                      key={pill}
                      type="button"
                      onClick={() => {
                        try { localStorage.setItem('kola_search_query', pill); } catch {}
                        router.push('/login');
                      }}
                      className="shrink-0 text-sm bg-white/10 hover:bg-white/25 hover:border-white/40 backdrop-blur-sm border border-white/20 px-4 py-1.5 rounded-full transition-all duration-200 active:scale-95"
                    >
                      {pill}
                    </button>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute z-30 bottom-8 left-0 right-0">
        <div className="container mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => scrollTo(idx)}
                className={`transition-all duration-300 h-1.5 rounded-full ${
                  idx === selectedIndex ? 'w-8 bg-white' : 'w-2 bg-white/40 hover:bg-white/60'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>

          <div className="hidden sm:flex items-center gap-3">
            <button
              onClick={scrollPrev}
              aria-label="Previous slide"
              className="w-10 h-10 rounded-full border border-white/30 flex items-center justify-center bg-black/20 backdrop-blur-sm hover:bg-white hover:text-black transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={scrollNext}
              aria-label="Next slide"
              className="w-10 h-10 rounded-full border border-white/30 flex items-center justify-center bg-black/20 backdrop-blur-sm hover:bg-white hover:text-black transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
