'use client';

import Link from 'next/link';
import { Twitter, Facebook, Instagram, Linkedin, PhoneIcon as WhatsApp } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-dark-bg text-gray-300 pt-20 pb-8 border-t border-white/10">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          <div className="space-y-6">
            <img src="/images/opt/logo-dark.webp" alt="Tukola" className="h-12 object-contain" />
            <p className="text-gray-400 leading-relaxed">Uganda's #1 blue-collar gig marketplace. Connecting skilled hands with the people who need them, safely and reliably.</p>
            <div className="flex items-center gap-4">
              {[Twitter, Facebook, Instagram, Linkedin, WhatsApp].map((Icon, i) => (
                <a key={i} href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-primary hover:text-white transition-colors"><Icon className="w-4 h-4" /></a>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-white font-bold font-heading mb-6 uppercase tracking-wider text-sm">About Tukola</h4>
            <ul className="space-y-4">
              {["Our Story", "Careers", "Press", "Trust & Safety", "Terms of Service"].map(item => (
                <li key={item}><a href="#" className="hover:text-accent transition-colors">{item}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold font-heading mb-6 uppercase tracking-wider text-sm">For Workers</h4>
            <ul className="space-y-4">
              {["Create Profile", "Find Jobs", "Payment Guidelines", "Worker Success Stories", "Help Center"].map(item => (
                <li key={item}><a href="#" className="hover:text-accent transition-colors">{item}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold font-heading mb-6 uppercase tracking-wider text-sm">For Employers</h4>
            <ul className="space-y-4">
              {["Post a Job", "Browse Workers", "Pricing", "Enterprise Solutions", "Contact Support"].map(item => (
                <li key={item}><a href="#" className="hover:text-accent transition-colors">{item}</a></li>
              ))}
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-sm">&copy; 2025 Tukola. All rights reserved. Uganda's #1 blue-collar gig marketplace.</p>
          <div className="flex gap-6 text-sm text-gray-500">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
