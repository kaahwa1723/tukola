'use client';

import { motion } from 'framer-motion';
import { BadgeCheck, ShieldCheck, HandCoins, Star } from 'lucide-react';

/**
 * Trust bar — statements about what the platform actually DOES,
 * not counters of how much it has done so far.
 *
 * Hard Rule 1 honoured: every claim maps to a real mechanism —
 *   ID-verified   → admin-set badge after National ID + 2 reference calls
 *   Money held    → every payment held until the customer confirms the work
 *   Guarantee     → claims flow pays up to UGX 200,000 from the reserve
 *   Ratings       → only left after a completed, paid job
 * Copy deliberately avoids the word "escrow" (customers don't know it)
 * and never advertises the commission rate on the landing page.
 */
const TRUST_ITEMS = [
  {
    icon: BadgeCheck,
    title: 'ID-Verified Fundis',
    sub: 'National ID + 2 reference calls, checked by our team',
  },
  {
    icon: ShieldCheck,
    title: 'Your Money Is Safe',
    sub: 'We hold the payment and the fundi only gets paid when you confirm the work is done',
  },
  {
    icon: HandCoins,
    title: 'Tukola Guarantee',
    sub: 'Covered up to UGX 200,000 if the work goes wrong',
  },
  {
    icon: Star,
    title: 'Honest Ratings Only',
    sub: 'A fundi\u2019s stars come from real finished jobs — never bought, never invented',
  },
];

export default function StatsBar() {
  return (
    <section className="bg-gradient-to-r from-[#1A2DB8] via-primary to-accent py-14 md:py-16 relative overflow-hidden">
      {/* Slow-moving sheen across the band */}
      <div className="absolute inset-0 opacity-20 pointer-events-none"
        style={{ background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.35) 50%, transparent 60%)', backgroundSize: '250% 100%', animation: 'trust-sheen 9s linear infinite' }} />
      <style>{`@keyframes trust-sheen { 0% { background-position: 120% 0; } 100% { background-position: -120% 0; } }`}</style>

      <div className="container mx-auto px-4 relative">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {TRUST_ITEMS.map((item, idx) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, duration: 0.6 }}
              whileHover={{ y: -6 }}
              className="group flex flex-col items-center text-center space-y-3 rounded-2xl p-3 -m-1 transition-colors duration-300 hover:bg-white/10 cursor-default"
            >
              <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center transition-all duration-300 group-hover:bg-white group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-[0_10px_28px_rgba(255,255,255,0.35)]">
                <item.icon size={22} strokeWidth={2.2}
                  className="text-white transition-colors duration-300 group-hover:text-primary" />
              </div>
              <div>
                <p className="font-heading font-bold text-white text-base md:text-lg relative inline-block">
                  {item.title}
                  {/* Underline sweep on hover */}
                  <span className="absolute left-0 -bottom-0.5 h-[2px] w-0 bg-white/80 rounded-full transition-all duration-400 ease-out group-hover:w-full" />
                </p>
                <p className="text-white/75 text-xs md:text-sm mt-1 leading-relaxed max-w-[220px] mx-auto transition-colors duration-300 group-hover:text-white/95">
                  {item.sub}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
