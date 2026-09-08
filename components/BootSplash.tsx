'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Branded boot splash shown once per tab session while the app hydrates.
 * - Renders nothing on the server and first client paint (no hydration mismatch).
 * - StrictMode-safe: the show decision runs once (ref guard); hide timers are
 *   idempotent across the dev double-effect cycle.
 */
export default function BootSplash() {
  const [visible, setVisible] = useState(false);
  const [hiding, setHiding] = useState(false);
  const decided = useRef(false);

  // Decide once, after hydration, whether to show.
  useEffect(() => {
    if (decided.current) return;
    decided.current = true;
    let seen = false;
    try { seen = sessionStorage.getItem('tukola_booted') === '1'; } catch {}
    if (!seen) {
      try { sessionStorage.setItem('tukola_booted', '1'); } catch {}
      setVisible(true);
    }
  }, []);

  // While visible: hide after load (min 1.1s, hard cap 2.4s), then unmount.
  useEffect(() => {
    if (!visible) return;

    const start = Date.now();
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    let deadTimer: ReturnType<typeof setTimeout> | undefined;

    const beginHide = () => {
      const wait = Math.max(0, 1100 - (Date.now() - start));
      hideTimer = setTimeout(() => setHiding(true), wait);
      deadTimer = setTimeout(() => setVisible(false), wait + 650);
    };

    if (document.readyState === 'complete') beginHide();
    else window.addEventListener('load', beginHide, { once: true });

    const capHide = setTimeout(() => setHiding(true), 2400);
    const capGone = setTimeout(() => setVisible(false), 3100);

    return () => {
      window.removeEventListener('load', beginHide);
      clearTimeout(hideTimer); clearTimeout(deadTimer);
      clearTimeout(capHide); clearTimeout(capGone);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div className={`boot-splash ${hiding ? 'boot-hide' : ''}`} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/opt/app-icon.webp" alt="" className="boot-logo w-24 h-24 object-cover rounded-[26px] ring-1 ring-white/30 mb-5" />
      <div className="boot-word text-2xl">TUKOLA</div>
      <div className="boot-tag text-[13px] mt-2 mb-8 tracking-wide">Find Work. Get Workers. Fast.</div>
      <div className="boot-bar-track"><div className="boot-bar" /></div>
    </div>
  );
}
