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
                <p className="text-white text-sm font-medium">Open <span className="font-bold">tukola.com</span> in your phone's browser</p>
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

          {/* CSS Phone Mockup */}
          <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.2 }} className="lg:w-1/2 flex justify-center">
            <div className="relative w-[300px] h-[600px] bg-navy rounded-[3rem] border-[8px] border-white shadow-2xl overflow-hidden transform rotate-[-5deg] hover:rotate-0 transition-transform duration-500">
              <div className="absolute top-0 inset-x-0 h-6 bg-white rounded-b-3xl w-1/2 mx-auto z-20"></div>
              <div className="absolute inset-0 bg-gray-50 flex flex-col z-10">
                <div className="bg-primary pt-12 pb-6 px-6 rounded-b-3xl shadow-sm text-white">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h4 className="text-sm opacity-80">Good Morning,</h4>
                      <h3 className="font-bold text-lg">Alex K.</h3>
                    </div>
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">AK</div>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3 flex items-center">
                    <div className="w-4 h-4 bg-white/50 rounded-full mr-3"></div>
                    <div className="h-4 bg-white/50 rounded w-1/2"></div>
                  </div>
                </div>
                <div className="p-6 flex-1 flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <div className="h-4 bg-gray-200 w-24 rounded"></div>
                    <div className="h-4 bg-gray-200 w-12 rounded"></div>
                  </div>
                  {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex gap-4">
                      <div className="w-12 h-12 bg-blue-50 rounded-xl"></div>
                      <div className="flex-1 space-y-2 py-1">
                        <div className="h-3 bg-gray-800 w-3/4 rounded"></div>
                        <div className="h-2 bg-gray-300 w-1/2 rounded"></div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="h-16 bg-white border-t border-gray-100 flex justify-around items-center px-6 pb-2">
                  {[1, 2, 3, 4].map(i => (<div key={i} className={`w-6 h-6 rounded-full ${i === 1 ? 'bg-primary' : 'bg-gray-200'}`}></div>))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
