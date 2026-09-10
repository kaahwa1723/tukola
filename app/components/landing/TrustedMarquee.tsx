'use client';

import { motion } from 'framer-motion';
import { MapPin } from 'lucide-react';

const locations = [
  "Kampala", "Wakiso", "Entebbe", "Mukono", "Jinja", "Mbarara", "Gulu", "Mbale",
  "Lira", "Fort Portal", "Masaka", "Arua", "Soroti", "Kabale", "Hoima", "Tororo",
];

const row1 = [...locations, ...locations];
const row2 = [...[...locations].reverse(), ...[...locations].reverse()];

export default function TrustedMarquee() {
  return (
    <section className="py-16 md:py-24 bg-gray-50 overflow-hidden relative">
      <div className="container mx-auto px-4 mb-10 text-center">
        <motion.h3
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="text-sm font-bold text-gray-400 uppercase tracking-widest"
        >Starting in Greater Kampala — built for all of Uganda</motion.h3>
      </div>
      <div className="relative flex flex-col gap-6">
        <div className="absolute left-0 top-0 bottom-0 w-24 md:w-48 bg-gradient-to-r from-gray-50 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 md:w-48 bg-gradient-to-l from-gray-50 to-transparent z-10 pointer-events-none" />
        {/* Row 1 — scrolls left */}
        <div className="flex w-max animate-marquee space-x-4">
          {row1.map((loc, idx) => (
            <div key={`r1-${idx}`} className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-2 min-w-fit">
              <MapPin className="w-4 h-4 text-primary shrink-0" />
              <span className="font-heading font-semibold text-lg text-gray-700 whitespace-nowrap">{loc}</span>
            </div>
          ))}
        </div>
        {/* Row 2 — scrolls right */}
        <div className="flex w-max animate-marquee space-x-4" style={{ animationDirection: 'reverse', animationDuration: '90s' }}>
          {row2.map((loc, idx) => (
            <div key={`r2-${idx}`} className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-2 min-w-fit">
              <MapPin className="w-4 h-4 text-accent shrink-0" />
              <span className="font-heading font-semibold text-lg text-gray-700 whitespace-nowrap">{loc}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
