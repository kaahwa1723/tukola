'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Services', href: '#services' },
    { name: 'How it Works', href: '#how-it-works' },
    { name: 'Get the App', href: '#download' },
  ];

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-white/85 backdrop-blur-xl py-3' 
          : 'bg-white/0 backdrop-blur-sm py-5'
      }`}
    >
      <div className={`absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-primary to-accent transition-opacity duration-300 ${scrolled ? 'opacity-100' : 'opacity-0'}`}></div>

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            {/* logo-dark.webp is actually the WHITE mark; logo-white-trim is the BLUE one */}
            <img
              src={scrolled ? '/images/opt/logo-blue-trim.webp' : '/images/opt/logo-white-trim.webp'}
              alt="Tukola Logo"
              className={`h-10 w-auto transition-all ${scrolled ? '' : 'drop-shadow-[0_1px_6px_rgba(0,0,0,0.45)]'}`}
            />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a 
                key={link.name} 
                href={link.href}
                className={`relative font-medium text-sm transition-colors group ${
                  scrolled ? 'text-foreground hover:text-primary' : 'text-white hover:text-white/90'
                }`}
              >
                {link.name}
                <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-accent to-primary origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100"></span>
              </a>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className={`px-5 py-2.5 rounded-full font-medium text-sm transition-all duration-300 ${
                scrolled
                  ? 'text-foreground border border-gray-200 bg-white/60 backdrop-blur-md hover:border-primary/40 hover:text-primary'
                  : 'text-white border border-white/25 bg-white/10 backdrop-blur-md hover:bg-white/20 hover:border-white/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]'
              }`}
            >
              Sign In
            </Link>
            <Link
              href="/onboarding"
              className="relative group overflow-hidden bg-gradient-to-r from-primary to-accent text-white px-5 py-2.5 rounded-full font-medium text-sm transition-all transform hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(41,82,232,0.4)]"
            >
              <span className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent opacity-60 pointer-events-none" />
              <span className="relative">Get Started</span>
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className={`md:hidden w-10 h-10 flex items-center justify-center rounded-full transition-all duration-300 ${
              mobileMenuOpen || scrolled
                ? 'text-foreground bg-gray-100/90 border border-gray-200'
                : 'text-white bg-white/10 backdrop-blur-md border border-white/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]'
            }`}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop — tap anywhere outside to close */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="md:hidden fixed inset-0 top-full bg-black/40 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="md:hidden absolute top-[calc(100%+8px)] left-3 right-3 rounded-3xl bg-white/95 backdrop-blur-xl shadow-[0_16px_48px_rgba(10,15,44,0.25)] border border-white/60 p-3 flex flex-col gap-1"
            >
              {navLinks.map((link, i) => (
                <motion.a
                  key={link.name}
                  href={link.href}
                  initial={{ opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.06 * i + 0.08, duration: 0.3, ease: 'easeOut' }}
                  className="flex items-center justify-between text-foreground font-semibold text-base px-4 py-3.5 rounded-2xl active:bg-primary/5 hover:bg-primary/5 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.name}
                  <span className="text-primary/40 text-lg">→</span>
                </motion.a>
              ))}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.28, duration: 0.3 }}
                className="flex flex-col gap-2.5 mt-2 pt-3 border-t border-gray-100"
              >
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-foreground font-semibold py-3.5 rounded-2xl text-center border border-gray-200 bg-white/70 backdrop-blur-md active:bg-gray-50"
                >
                  Sign In
                </Link>
                <Link
                  href="/onboarding"
                  onClick={() => setMobileMenuOpen(false)}
                  className="relative overflow-hidden bg-gradient-to-r from-primary to-accent text-white py-3.5 rounded-2xl font-semibold shadow-lg shadow-primary/25 text-center"
                >
                  <span className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent opacity-60 pointer-events-none" />
                  <span className="relative">Get Started — It's Free</span>
                </Link>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
