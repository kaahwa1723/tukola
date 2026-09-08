'use client';

import { motion } from 'framer-motion';

const steps = [
  { num: "1", title: "Create Your Profile", desc: "Set up your skills, experience, and availability. Or if you're hiring, verify your business." },
  { num: "2", title: "Browse or Post Jobs", desc: "Find work that matches your skills near you, or instantly broadcast your job to available workers." },
  { num: "3", title: "Work & Get Paid", desc: "Complete the job successfully and get paid the same day through our secure platform." }
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 bg-white relative overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-[0.06] grayscale bg-cover bg-center pointer-events-none" style={{ backgroundImage: `url(/images/opt/hiw-bg.webp)` }}></div>
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-20">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-3xl md:text-4xl font-bold font-heading text-navy mb-4">How It Works</motion.h2>
          <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="text-gray-600 text-lg">Simple, fast, and secure. We handle the hard parts so you can focus on the work.</motion.p>
        </div>
        <div className="relative">
          <div className="hidden md:block absolute top-12 left-[16.6%] right-[16.6%] h-0.5 bg-gradient-to-r from-primary/20 via-accent/40 to-primary/20 z-0">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-accent to-transparent w-full h-full opacity-50 animate-[shimmer_3s_infinite]"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8 relative z-10">
            {steps.map((step, idx) => (
              <motion.div key={idx} initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.2, duration: 0.7, ease: "easeOut" }} className="flex flex-col items-center text-center group">
                <div className="w-24 h-24 rounded-full bg-white shadow-xl flex items-center justify-center mb-8 relative border border-gray-50 group-hover:scale-110 transition-transform duration-500">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent rounded-full opacity-10 group-hover:opacity-20 transition-opacity"></div>
                  <span className="text-5xl font-heading font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-primary to-accent">{step.num}</span>
                </div>
                <h3 className="text-2xl font-bold font-heading text-navy mb-4 group-hover:text-primary transition-colors">{step.title}</h3>
                <p className="text-gray-600 leading-relaxed max-w-sm">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
