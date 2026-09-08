'use client';

import { motion } from 'framer-motion';
import { Share, PlusSquare, Smartphone } from 'lucide-react';

/**
 * PWA install section. There are NO App Store / Google Play builds —
 * Tukola is a Progressive Web App, so the honest call-to-action is
 * "Add to Home Screen" from the browser.
 */
export default function AppDownload() {
  return (
    <section id="download" className="relative py-20 md:py-32 bg-gradient-to-br from-dark-bg via-navy to-primary overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="lg:w-1/2 text-center lg:text-left">
            <div className="inline-block p-3 bg-white/10 backdrop-blur-md rounded-2xl mb-8 border border-white/20">
              <img src="/images/opt/app-icon.webp" alt="Tukola App Icon" className="w-16 h-16 object-contain rounded-xl" />
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold font-heading text-white mb-6 leading-tight">Take Tukola <br/>With You</h2>
            <p className="text-lg md:text-xl text-blue-100 max-w-xl mx-auto lg:mx-0 mb-10 leading-relaxed">No app store needed. Tukola works right in your phone's browser — add it to your home screen and it opens like an app.</p>
            <div className="flex flex-col gap-4 max-w-md mx-auto lg:mx-0">
              <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-5 py-4 text-left">
                <div className="w-10 h-10 bg-white/15 rounded-lg flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5 text-white" />
                </div>
                <p className="text-white text-sm font-medium">Open <span className="font-bold">Tukola</span> in your phone's browser</p>
              </div>
              <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-5 py-4 text-left">
                <div className="w-10 h-10 bg-white/15 rounded-lg flex items-center justify-center shrink-0">
                  <Share className="w-5 h-5 text-white" />
                </div>
                <p className="text-white text-sm font-medium">Tap the <span className="font-bold">Share</span> or <span className="font-bold">⋮ menu</span> button</p>
              </div>
              <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-5 py-4 text-left">
                <div className="w-10 h-10 bg-white/15 rounded-lg flex items-center justify-center shrink-0">
                  <PlusSquare className="w-5 h-5 text-white" />
                </div>
                <p className="text-white text-sm font-medium">Choose <span className="font-bold">"Add to Home Screen"</span> — done!</p>
              </div>
            </div>
            <p className="mt-6 text-sm text-blue-200/80 font-medium">Works on any smartphone — iPhone, Android, even older devices</p>
          </motion.div>

          {/* Real app screenshots in phone frames — actual product UI, not a mockup */}
          <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.2 }} className="lg:w-1/2 flex justify-center">
            <div className="relative flex items-end">
              <div className="relative w-[220px] md:w-[260px] rounded-[2rem] border-[6px] border-white/90 shadow-2xl overflow-hidden transform rotate-[4deg] translate-x-8 translate-y-4 opacity-90 hidden sm:block">
                <img src="/screenshots/app-worker-dash.webp" alt="Tukola worker app — real screenshot" className="w-full h-auto block" loading="lazy" />
              </div>
              <div className="relative w-[240px] md:w-[280px] rounded-[2.2rem] border-[6px] border-white shadow-2xl overflow-hidden transform rotate-[-3deg] hover:rotate-0 transition-transform duration-500 z-10">
                <img src="/screenshots/app-employer-dash.webp" alt="Tukola employer app — real screenshot" className="w-full h-auto block" loading="lazy" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
