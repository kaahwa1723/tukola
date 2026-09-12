'use client';

import { motion } from 'framer-motion';
import { UserX, Banknote, SearchX } from 'lucide-react';

const PAINS = [
  {
    icon: SearchX,
    title: 'Finding a fundi is guesswork',
    desc: 'You ask around, get a number from a cousin of a friend, and hope for the best. There is no way to know who is actually good before they start.',
  },
  {
    icon: UserX,
    title: 'No one is accountable',
    desc: 'Pay upfront and the work can stall. Refuse to pay upfront and the fundi walks. When things go wrong, nobody is on your side.',
  },
  {
    icon: Banknote,
    title: 'Fundis work hard and still wait to eat',
    desc: 'Skilled workers finish jobs and then chase payments for weeks. Talent is everywhere in Uganda — trust and steady work are not.',
  },
];

export default function ProblemStatement() {
  return (
    <section className="py-20 md:py-28 bg-white relative overflow-hidden">
      {/* Soft background accents */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-[0.05] pointer-events-none"
        style={{ background: 'radial-gradient(circle, #DC2626 0%, transparent 70%)' }} />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-[0.06] pointer-events-none"
        style={{ background: 'radial-gradient(circle, #2952E8 0%, transparent 70%)' }} />

      <div className="container mx-auto px-4 md:px-6 relative">
        <div className="max-w-3xl mx-auto text-center mb-14">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-sm font-bold text-primary uppercase tracking-widest mb-4"
          >
            The problem we are fixing
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="text-3xl md:text-4xl lg:text-5xl font-bold font-heading text-navy leading-tight"
          >
            Hiring a fundi in Uganda still runs on luck.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-lg text-gray-600 mt-5 leading-relaxed"
          >
            Every day, people hand money to strangers they found through word of mouth — and every day, skilled fundis finish honest work and struggle to get paid. Tukola exists to end both.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6 max-w-5xl mx-auto">
          {PAINS.map((pain, idx) => {
            const Icon = pain.icon;
            return (
              <motion.div
                key={pain.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.12, duration: 0.55 }}
                whileHover={{ y: -8 }}
                className="group relative bg-gray-50 rounded-3xl p-7 md:p-8 border border-gray-100 overflow-hidden transition-colors duration-300 hover:bg-white hover:border-red-100 hover:shadow-[0_24px_48px_-12px_rgba(220,38,38,0.14)] cursor-default"
              >
                {/* Red accent bar sweeps in from the left on hover */}
                <span className="absolute top-0 left-0 h-1 w-0 group-hover:w-full transition-all duration-500 ease-out bg-gradient-to-r from-red-500 to-orange-400" />
                {/* Faint oversized icon watermark appears on hover */}
                <Icon className="absolute -bottom-6 -right-6 w-28 h-28 text-red-500 opacity-0 group-hover:opacity-[0.06] rotate-12 group-hover:rotate-0 transition-all duration-500 pointer-events-none" />

                <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mb-5 transition-all duration-300 group-hover:bg-gradient-to-br group-hover:from-red-500 group-hover:to-orange-500 group-hover:text-white group-hover:scale-110 group-hover:-rotate-6 group-hover:shadow-[0_8px_20px_rgba(220,38,38,0.35)]">
                  <Icon className="w-6 h-6 transition-transform duration-300 group-hover:scale-110" />
                </div>
                <h3 className="text-lg font-bold font-heading text-navy mb-2.5 transition-colors duration-300 group-hover:text-red-600">
                  {pain.title}
                </h3>
                <p className="text-gray-600 text-[15px] leading-relaxed transition-colors duration-300 group-hover:text-gray-700">
                  {pain.desc}
                </p>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mt-12 flex justify-center"
        >
          <p className="inline-block text-center font-heading font-bold text-lg md:text-xl px-6 py-3.5 rounded-2xl text-white shadow-[0_12px_32px_rgba(41,82,232,0.30)]"
            style={{ background: 'linear-gradient(135deg,#2952E8,#1A2DB8)' }}>
            Tukola replaces luck with verified profiles, protected payments and real ratings.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
