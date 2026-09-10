'use client';

import { motion } from 'framer-motion';
import { HeartHandshake, Scale, Hammer, Users } from 'lucide-react';

const VALUES = [
  {
    icon: HeartHandshake,
    title: 'Trust before transactions',
    desc: 'We would rather grow slowly with people who trust us than fast with people who don\u2019t. Every feature starts with safety.',
  },
  {
    icon: Scale,
    title: 'Fair to both sides',
    desc: 'Customers deserve work done right. Fundis deserve to be paid on time. We protect both — never one at the expense of the other.',
  },
  {
    icon: Hammer,
    title: 'Dignity in skilled work',
    desc: 'Fundis are professionals, not a last resort. We build tools that treat their craft, time and reputation with respect.',
  },
  {
    icon: Users,
    title: 'Built with the community',
    desc: 'We are Ugandan, built for Uganda. Our roadmap comes from real fundis and real customers — your feedback shapes what we ship.',
  },
];

export default function CoreValues() {
  return (
    <section className="py-20 md:py-28 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-2xl mx-auto text-center mb-14">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-sm font-bold text-primary uppercase tracking-widest mb-4"
          >
            What we stand for
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="text-3xl md:text-4xl lg:text-5xl font-bold font-heading text-navy leading-tight"
          >
            Our core values
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {VALUES.map((value, idx) => {
            const Icon = value.icon;
            return (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1, duration: 0.55 }}
                className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-[0_16px_40px_rgba(41,82,232,0.12)] hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden"
              >
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary to-accent -translate-x-full opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300" />
                <div className="flex items-start gap-5">
                  <div className="w-12 h-12 shrink-0 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 text-primary flex items-center justify-center">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold font-heading text-navy mb-2">{value.title}</h3>
                    <p className="text-gray-600 text-[15px] leading-relaxed">{value.desc}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
