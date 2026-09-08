'use client';

import { motion } from 'framer-motion';
import { BadgeCheck, ShieldCheck, HandCoins, Receipt } from 'lucide-react';

/**
 * Trust bar — statements about what the platform actually DOES,
 * not counters of how much it has done so far.
 *
 * Hard Rule 1 honoured: every claim maps to a real mechanism —
 *   ID-verified   → admin-set badge after National ID + 2 reference calls
 *   Escrow        → every payment held until the customer confirms the work
 *   Guarantee     → claims flow pays up to UGX 200,000 from the reserve
 *   17% flat fee  → the commission split coded in the escrow ledger
 * (Early-stage counters like "3 jobs completed" deter more than they
 *  persuade, so the bar carries no volume numbers at all.)
 */
const TRUST_ITEMS = [
  {
    icon: BadgeCheck,
    title: 'ID-Verified Fundis',
    sub: 'National ID + 2 reference calls, checked by our team',
  },
  {
    icon: ShieldCheck,
    title: 'Escrow-Protected',
    sub: 'Your money is held until you confirm the job is done',
  },
  {
    icon: HandCoins,
    title: 'Tukola Guarantee',
    sub: 'Covered up to UGX 200,000 if the work goes wrong',
  },
  {
    icon: Receipt,
    title: 'One Flat 17% Fee',
    sub: 'Transparent pricing — no hidden charges, ever',
  },
];

export default function StatsBar() {
  return (
    <section className="bg-gradient-to-r from-[#1A2DB8] via-primary to-accent py-14 md:py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {TRUST_ITEMS.map((item, idx) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, duration: 0.6 }}
              className="flex flex-col items-center text-center space-y-3"
            >
              <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                <item.icon size={22} className="text-white" strokeWidth={2.2} />
              </div>
              <div>
                <p className="font-heading font-bold text-white text-base md:text-lg">{item.title}</p>
                <p className="text-white/75 text-xs md:text-sm mt-1 leading-relaxed max-w-[220px] mx-auto">{item.sub}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
