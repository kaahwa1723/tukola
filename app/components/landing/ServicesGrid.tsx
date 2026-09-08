'use client';

import { motion, type Variants } from 'framer-motion';
import { Sparkles, Wrench, Zap, HardHat, Package, Leaf, Utensils, ShieldCheck, Car, PartyPopper, Scissors, Hammer, Wheat, SprayCan, Smartphone, PlusCircle } from 'lucide-react';

const services = [
  { name: 'Cleaning', icon: Sparkles, color: 'text-blue-500', baseColor: 'from-blue-50 to-blue-100', bg: 'bg-blue-50' },
  { name: 'Plumbing', icon: Wrench, color: 'text-cyan-500', baseColor: 'from-cyan-50 to-cyan-100', bg: 'bg-cyan-50' },
  { name: 'Electrical', icon: Zap, color: 'text-yellow-500', baseColor: 'from-yellow-50 to-yellow-100', bg: 'bg-yellow-50' },
  { name: 'Construction', icon: HardHat, color: 'text-orange-500', baseColor: 'from-orange-50 to-orange-100', bg: 'bg-orange-50' },
  { name: 'Moving', icon: Package, color: 'text-indigo-500', baseColor: 'from-indigo-50 to-indigo-100', bg: 'bg-indigo-50' },
  { name: 'Gardening', icon: Leaf, color: 'text-green-500', baseColor: 'from-green-50 to-green-100', bg: 'bg-green-50' },
  { name: 'Cooking', icon: Utensils, color: 'text-red-500', baseColor: 'from-red-50 to-red-100', bg: 'bg-red-50' },
  { name: 'Security', icon: ShieldCheck, color: 'text-slate-700', baseColor: 'from-slate-100 to-slate-200', bg: 'bg-slate-100' },
  { name: 'Driving', icon: Car, color: 'text-sky-500', baseColor: 'from-sky-50 to-sky-100', bg: 'bg-sky-50' },
  { name: 'Events', icon: PartyPopper, color: 'text-fuchsia-500', baseColor: 'from-fuchsia-50 to-fuchsia-100', bg: 'bg-fuchsia-50' },
  { name: 'Tailoring', icon: Scissors, color: 'text-pink-500', baseColor: 'from-pink-50 to-pink-100', bg: 'bg-pink-50' },
  { name: 'Repair', icon: Hammer, color: 'text-amber-600', baseColor: 'from-amber-50 to-amber-100', bg: 'bg-amber-50' },
  { name: 'Farming', icon: Wheat, color: 'text-emerald-600', baseColor: 'from-emerald-50 to-emerald-100', bg: 'bg-emerald-50' },
  { name: 'Beauty', icon: SprayCan, color: 'text-rose-500', baseColor: 'from-rose-50 to-rose-100', bg: 'bg-rose-50' },
  { name: 'Delivery', icon: Smartphone, color: 'text-violet-500', baseColor: 'from-violet-50 to-violet-100', bg: 'bg-violet-50' },
  { name: 'More', icon: PlusCircle, color: 'text-primary', baseColor: 'from-primary/10 to-primary/20', bg: 'bg-primary/10' },
];

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const itemVariants: Variants = { hidden: { opacity: 0, scale: 0.9, y: 20 }, show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } };

export default function ServicesGrid() {
  return (
    <section id="services" className="py-24 bg-white relative">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-3xl md:text-4xl font-bold font-heading text-navy mb-4">Our Services</motion.h2>
          <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="text-gray-600 text-lg">Whatever the job, we have a verified professional ready to help you get it done right.</motion.p>
        </div>
        <motion.div variants={containerVariants} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-50px" }} className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <motion.div key={index} variants={itemVariants} className="group p-6 rounded-2xl border border-gray-100 bg-white transition-all duration-250 ease-out cursor-pointer transform hover:-translate-y-[6px] hover:shadow-[0_20px_60px_rgba(41,82,232,0.15),0_8px_20px_rgba(0,0,0,0.08)] flex flex-col items-center justify-center text-center gap-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-accent opacity-0 group-hover:opacity-100 transition-opacity duration-250"></div>
                <div className={`w-14 h-14 rounded-full ${service.bg} group-hover:bg-gradient-to-b ${service.baseColor} flex items-center justify-center transition-all duration-250`}>
                  <Icon className={`w-7 h-7 ${service.color} group-hover:scale-[1.15] transition-transform duration-250`} />
                </div>
                <h3 className="font-heading font-semibold text-navy group-hover:text-primary transition-colors duration-250">{service.name}</h3>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
