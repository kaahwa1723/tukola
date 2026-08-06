'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';

interface PublicStats {
  fundis: number;
  jobsCompleted: number;
  avgRating: number | null;
}

function CountUp({ end, suffix = "", isDecimal = false, duration = 2000 }: { end: number, suffix?: string, isDecimal?: boolean, duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });

  useEffect(() => {
    if (!inView) return;
    let startTime: number | null = null;
    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 4);
      setCount(easeProgress * end);
      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step);
      }
    };

    animationFrameId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(animationFrameId);
  }, [end, duration, inView]);

  const displayValue = isDecimal ? count.toFixed(1) : Math.floor(count).toLocaleString();

  return (
    <span ref={ref} className="font-heading font-bold text-4xl md:text-5xl text-white">
      {displayValue}{suffix}
    </span>
  );
}

/**
 * Live counters from the database — or nothing. Hard Rule 1:
 * the landing page may only claim what the system can prove.
 */
export default function StatsBar() {
  const [stats, setStats] = useState<PublicStats | null>(null);

  useEffect(() => {
    fetch('/api/public-stats')
      .then(r => (r.ok ? r.json() : null))
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  if (!stats) return null;

  const items = [
    { label: 'Verified fundis', value: stats.fundis, suffix: '' },
    { label: 'Jobs completed', value: stats.jobsCompleted, suffix: '' },
    ...(stats.avgRating !== null
      ? [{ label: 'Average fundi rating', value: stats.avgRating, suffix: '★', isDecimal: true }]
      : []),
  ];

  return (
    <section className="bg-gradient-to-r from-[#1A2DB8] via-primary to-accent py-16">
      <div className="container mx-auto px-4">
        <div className={`grid grid-cols-2 ${items.length > 2 ? 'md:grid-cols-3' : ''} gap-8 md:gap-4 text-center`}>
          {items.map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, duration: 0.6 }}
              className="flex flex-col items-center justify-center space-y-2"
            >
              <CountUp end={stat.value} suffix={stat.suffix} isDecimal={stat.isDecimal} />
              <span className="text-white/80 font-medium text-sm md:text-base uppercase tracking-wider">
                {stat.label}
              </span>
            </motion.div>
          ))}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: items.length * 0.1, duration: 0.6 }}
            className="flex flex-col items-center justify-center space-y-2"
          >
            <span className="font-heading font-bold text-4xl md:text-5xl text-white">100%</span>
            <span className="text-white/80 font-medium text-sm md:text-base uppercase tracking-wider">
              Payments held in escrow
            </span>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
