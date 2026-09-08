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
          <div className="hidden md:flex items-center gap-4">
            <Link href="/login" className={`font-medium text-sm transition-colors ${
              scrolled ? 'text-foreground hover:text-primary' : 'text-white hover:text-white/80'
            }`}>
              Sign In
            </Link>
            <Link href="/onboarding" className="relative group bg-gradient-to-r from-primary to-accent text-white px-5 py-2.5 rounded-full font-medium text-sm transition-all transform hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(41,82,232,0.4)]">
              Get Started
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden text-foreground p-2"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className={scrolled ? "text-foreground" : "text-white"} /> : <Menu className={scrolled ? "text-foreground" : "text-white"} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="md:hidden absolute top-full left-0 w-full bg-white shadow-xl py-6 px-4 flex flex-col gap-4 border-t border-gray-100"
          >
            {navLinks.map((link) => (
              <a 
                key={link.name} 
                href={link.href}
                className="text-foreground font-medium text-lg py-2 border-b border-gray-50"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.name}
              </a>
            ))}
            <div className="flex flex-col gap-3 mt-4">
              <Link href="/login" className="text-foreground font-medium py-3 border border-gray-200 rounded-lg text-center">
                Sign In
              </Link>
              <Link href="/onboarding" className="bg-gradient-to-r from-primary to-accent text-white py-3 rounded-lg font-medium shadow-md text-center">
                Get Started
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
