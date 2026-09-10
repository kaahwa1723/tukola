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
      <div className="container mx-auto px-4 md:px-6">
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {PAINS.map((pain, idx) => {
            const Icon = pain.icon;
            return (
              <motion.div
                key={pain.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.12, duration: 0.55 }}
                className="bg-gray-50 rounded-3xl p-8 border border-gray-100 hover:border-primary/20 hover:shadow-[0_12px_36px_rgba(41,82,232,0.10)] transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mb-5">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold font-heading text-navy mb-2.5">{pain.title}</h3>
                <p className="text-gray-600 text-[15px] leading-relaxed">{pain.desc}</p>
              </motion.div>
            );
          })}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="text-center text-primary font-heading font-bold text-lg md:text-xl mt-12"
        >
          Tukola replaces luck with verified profiles, protected payments and real ratings.
        </motion.p>
      </div>
    </section>
  );
}
