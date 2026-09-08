'use client';

import { motion, type Variants } from 'framer-motion';
import { Star } from 'lucide-react';

const testimonials = [
  { initials: "SK", name: "Sarah K.", role: "Hotel Manager", quote: "Found 3 cleaners in under 10 minutes. Tukola is an absolute game-changer for the hospitality industry here.", color: "bg-blue-500" },
  { initials: "JM", name: "John M.", role: "Construction Foreman", quote: "My workers get paid on time and employers trust us because of verified profiles. It professionalizes our entire operation.", color: "bg-emerald-500" },
  { initials: "GA", name: "Grace A.", role: "Event Planner", quote: "Booked 8 experienced waitstaff for a wedding in one afternoon. Incredible platform that saves me hours of stress.", color: "bg-purple-500" }
];

const containerVariants: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };
const starVariants: Variants = { hidden: { opacity: 0, scale: 0.5 }, show: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 300 } } };

export default function Testimonials() {
  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-3xl md:text-4xl font-bold font-heading text-navy mb-4">Trusted by Ugandans</motion.h2>
          <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="text-gray-600 text-lg">Don't just take our word for it. Here's what people using Tukola every day have to say.</motion.p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((test, idx) => (
            <motion.div key={idx} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.15, duration: 0.6 }}
              className="bg-white rounded-3xl p-8 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_24px_48px_rgba(41,82,232,0.12)] transition-all duration-300 flex flex-col h-full transform hover:-translate-y-[6px] relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="absolute -top-4 right-4 text-primary opacity-[0.06] text-9xl font-serif leading-none select-none pointer-events-none">&ldquo;</div>
              <motion.div variants={containerVariants} initial="hidden" whileInView="show" viewport={{ once: true }} className="flex items-center gap-1 mb-6 text-yellow-400 relative z-10">
                {[1, 2, 3, 4, 5].map(i => (<motion.div key={i} variants={starVariants}><Star className="w-5 h-5 fill-current" /></motion.div>))}
              </motion.div>
              <p className="text-navy/80 text-lg leading-relaxed mb-8 flex-grow font-medium italic relative z-10">&ldquo;{test.quote}&rdquo;</p>
              <div className="flex items-center gap-4 mt-auto relative z-10">
                <div className={`w-12 h-12 rounded-full ${test.color} flex items-center justify-center text-white font-bold text-lg`}>{test.initials}</div>
                <div>
                  <h4 className="font-bold font-heading text-navy">{test.name}</h4>
                  <p className="text-gray-500 text-sm">{test.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
