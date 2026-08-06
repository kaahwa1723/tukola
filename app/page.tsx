'use client';

import Navbar from '@/app/components/landing/Navbar';
import HeroSlider from '@/app/components/landing/HeroSlider';
import TaglineSection from '@/app/components/landing/TaglineSection';
import StatsBar from '@/app/components/landing/StatsBar';
import JobTicker from '@/app/components/landing/JobTicker';
import TrustedMarquee from '@/app/components/landing/TrustedMarquee';
import ServicesGrid from '@/app/components/landing/ServicesGrid';
import LiveJobsFeed from '@/app/components/landing/LiveJobsFeed';
import HowItWorks from '@/app/components/landing/HowItWorks';
import WhyChoose from '@/app/components/landing/WhyChoose';
import AppDownload from '@/app/components/landing/AppDownload';
import Footer from '@/app/components/landing/Footer';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans text-foreground overflow-x-hidden">
      <Navbar />
      <main>
        <HeroSlider />
        <TaglineSection />
        <StatsBar />
        <JobTicker />
        <TrustedMarquee />
        <ServicesGrid />
        <LiveJobsFeed />
        <HowItWorks />
        <WhyChoose />
        {/* Testimonials section intentionally removed until REAL customer
            quotes exist — fabricated social proof violates Hard Rule 1 */}
        <AppDownload />
      </main>
      <Footer />
    </div>
  );
}
