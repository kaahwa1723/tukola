'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Share, Check } from 'lucide-react';

/**
 * PWA install section. There are NO App Store / Google Play builds —
 * Tukola is a Progressive Web App. The primary CTA is a single tap:
 * we capture the browser's beforeinstallprompt event and trigger it
 * directly, so installing feels like any other button. Only when the
 * browser can't offer a native prompt (mainly iOS Safari) do we show
 * a one-line fallback hint.
 */
export default function AppDownload() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [installed, setInstalled] = useState(false);
  const [promptUsed, setPromptUsed] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    setPromptUsed(true);
    try {
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') setInstallPrompt(null);
    } catch {}
  };

  const isIOS =
    typeof navigator !== 'undefined' &&
    /iphone|ipad|ipod/i.test(navigator.userAgent);

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
            <p className="text-lg md:text-xl text-blue-100 max-w-xl mx-auto lg:mx-0 mb-10 leading-relaxed">Free, no app store needed. One tap and Tukola lives on your home screen like any other app.</p>

            {/* One-tap install */}
            <div className="max-w-md mx-auto lg:mx-0">
              {installed ? (
                <div className="inline-flex items-center gap-3 bg-green-400/20 border border-green-300/40 text-white font-semibold px-8 py-4 rounded-full">
                  <Check className="w-5 h-5 text-green-300" />
                  Installed — find Tukola on your home screen
                </div>
              ) : (
                <button
                  onClick={handleInstall}
                  className="group relative overflow-hidden inline-flex items-center justify-center gap-3 w-full sm:w-auto bg-white text-navy font-bold text-lg px-10 py-4 rounded-full shadow-[0_12px_36px_rgba(0,0,0,0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_44px_rgba(0,0,0,0.45)] active:scale-95"
                >
                  <Download className="w-5 h-5 text-primary group-hover:animate-bounce" />
                  Install the App — Free
                </button>
              )}

              {/* Fallback hint — only when the browser can't show the native
                  prompt (iOS Safari, or the user already dismissed it) */}
              {!installed && (!installPrompt || promptUsed) && (
                <p className="mt-4 text-sm text-blue-200/90 font-medium flex items-center justify-center lg:justify-start gap-2">
                  {isIOS ? (
                    <>On iPhone: tap <Share className="w-4 h-4 inline" /> Share, then <span className="font-bold">"Add to Home Screen"</span></>
                  ) : (
                    <>If nothing popped up, use your browser menu (⋮) → <span className="font-bold">"Install app"</span> or <span className="font-bold">"Add to Home Screen"</span></>
                  )}
                </p>
              )}

              <p className="mt-6 text-sm text-blue-200/80 font-medium">Works on any smartphone — iPhone, Android, even older devices</p>
            </div>
          </motion.div>

          {/* Real screenshots — desktop web view + phone app UI, actual product, not mockups */}
          <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.2 }} className="lg:w-1/2 w-full flex justify-center">
            <div className="relative">
              {/* Desktop browser frame */}
              <div className="relative w-full max-w-[520px] rounded-2xl overflow-hidden shadow-2xl border border-white/25 bg-[#0d1330]">
                <div className="flex items-center gap-1.5 px-4 py-2.5 bg-white/10 border-b border-white/10">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
                  <span className="ml-3 text-[11px] text-white/60 font-medium bg-white/10 rounded-md px-3 py-1 flex-1 text-center truncate">tukolaapp.com</span>
                </div>
                <img src="/frames/web-view.webp" alt="Tukola website on desktop — real screenshot" className="w-full h-auto block" loading="lazy" />
              </div>
              {/* Phone overlapping the corner */}
              <div className="absolute -bottom-8 -right-2 md:-right-8 w-[110px] md:w-[140px] rounded-[1.4rem] border-4 border-white shadow-2xl overflow-hidden transform rotate-[6deg] hover:rotate-0 transition-transform duration-500">
                <img src="/frames/employer-dash-v2.webp" alt="Tukola app on phone — real screenshot" className="w-full h-auto block" loading="lazy" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
