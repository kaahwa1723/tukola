'use client';

import { motion } from 'framer-motion';
import { Shield, Zap, Star, MapPin } from 'lucide-react';

const features = [
  { icon: Shield, title: "Verified Profiles", desc: "Every worker is background-checked and vetted before they join." },
  { icon: Zap, title: "Hire in 5 Minutes", desc: "Our matching algorithm connects you to the right talent instantly." },
  { icon: Star, title: "Transparent Ratings", desc: "Read real reviews from previous employers before you hire." },
  { icon: MapPin, title: "Location-First", desc: "Find workers in your exact neighborhood to save time and money." }
];

export default function WhyChoose() {
  return (
    <section className="py-24 bg-surface relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#2952E8 2px, transparent 2px)', backgroundSize: '30px 30px' }}></div>
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="flex flex-col lg:flex-row gap-16 items-center">
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="lg:w-1/2">
            <div className="relative aspect-[4/5] rounded-[2rem] overflow-hidden shadow-2xl">
              <img src="/images/opt/market.webp" alt="Uganda Market" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-navy/80 via-transparent to-transparent"></div>
              <div className="absolute bottom-8 left-8 right-8">
                <h2 className="text-3xl md:text-4xl font-bold font-heading text-white mb-4 leading-tight">Why Choose Tukola?</h2>
                <p className="text-white/90 text-lg leading-relaxed">We're building more than just a job board. We're building a foundation of trust for Uganda's blue-collar economy.</p>
              </div>
            </div>
          </motion.div>
          <div className="lg:w-1/2 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {features.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <motion.div key={idx} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.1, duration: 0.5 }}
                  className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-[0_16px_40px_rgba(41,82,232,0.12)] transition-all duration-300 group hover:-translate-y-1 relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary to-accent -translate-x-full opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300"></div>
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mb-6 text-primary"><Icon className="w-7 h-7" /></div>
                  <h3 className="text-xl font-bold font-heading text-navy mb-3">{feat.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feat.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
