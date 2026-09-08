'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-dark-bg text-gray-300 pt-16 md:pt-20 pb-8 border-t border-white/10">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10 md:gap-12 mb-12 md:mb-16">
          <div className="col-span-2 lg:col-span-1 space-y-6">
            <img src="/images/opt/logo-dark.webp" alt="Tukola" className="h-12 object-contain" />
            <p className="text-gray-400 leading-relaxed">Uganda's blue-collar gig marketplace. Connecting skilled hands with the people who need them, safely and reliably.</p>
          </div>
          <div>
            <h4 className="text-white font-bold font-heading mb-5 uppercase tracking-wider text-sm">About Tukola</h4>
            <ul className="space-y-3">
              <li><Link href="/#how-it-works" className="hover:text-accent transition-colors">How It Works</Link></li>
              <li><Link href="/terms" className="hover:text-accent transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-accent transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold font-heading mb-5 uppercase tracking-wider text-sm">For Workers</h4>
            <ul className="space-y-3">
              <li><Link href="/onboarding" className="hover:text-accent transition-colors">Create Profile</Link></li>
              <li><Link href="/login" className="hover:text-accent transition-colors">Find Jobs</Link></li>
              <li><Link href="/terms#payments" className="hover:text-accent transition-colors">Payment Guidelines</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold font-heading mb-5 uppercase tracking-wider text-sm">For Employers</h4>
            <ul className="space-y-3">
              <li><Link href="/login" className="hover:text-accent transition-colors">Post a Job</Link></li>
              <li><Link href="/login" className="hover:text-accent transition-colors">Browse Workers</Link></li>
              <li><Link href="/terms#fees" className="hover:text-accent transition-colors">Pricing</Link></li>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-sm">&copy; 2026 Tukola. All rights reserved. Kampala, Uganda.</p>
          <div className="flex gap-6 text-sm text-gray-500">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
