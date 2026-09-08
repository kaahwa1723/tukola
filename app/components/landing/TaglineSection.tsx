'use client';

import { motion } from 'framer-motion';

export default function TaglineSection() {
  return (
    <section className="relative py-24 md:py-32 bg-white overflow-hidden flex flex-col items-center justify-center text-center">
      {/* Floating background orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-accent/10 rounded-full blur-3xl animate-float-orb pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/5 rounded-full blur-3xl animate-float-orb pointer-events-none" style={{ animationDelay: '-7s' }}></div>
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="flex flex-col items-center"
        >
          {/* Logo tile */}
          <div className="relative mb-8">
            <div className="absolute inset-0 scale-150 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/opt/logo-tile.webp"
              alt="Tukola app icon"
              className="relative w-24 h-24 md:w-28 md:h-28 object-cover rounded-[26px] shadow-xl shadow-primary/25 ring-1 ring-black/5 animate-float"
            />
          </div>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold font-heading text-navy max-w-3xl leading-tight mb-6 tracking-tight">
            Uganda&apos;s <span className="text-gradient">#1 blue-collar</span> gig marketplace
          </h2>

          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mb-10 leading-relaxed">
            We are the bridge connecting hardworking professionals with businesses that need them.
            From reliable cleaners to expert electricians, find verified talent ready to work.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <button className="btn-gradient px-8 py-4 rounded-xl text-lg">
              Start Finding Work
            </button>
            <button className="border-2 border-primary/70 text-primary bg-transparent px-8 py-4 rounded-xl font-semibold text-lg hover:bg-primary/5 hover:border-primary transition-all duration-200 active:scale-95">
              Post a Job
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
