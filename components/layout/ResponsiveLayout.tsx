'use client';

import { ReactNode } from 'react';
import { DesktopSidebar } from './DesktopSidebar';
import { MobileNav } from './MobileNav';
import { useKola } from '@/lib/store';

interface ResponsiveLayoutProps {
  children: ReactNode;
  basePath: 'worker' | 'employer';
  messageBadge?: number;
}

export function ResponsiveLayout({ children, basePath, messageBadge = 0 }: ResponsiveLayoutProps) {
  const { user } = useKola();

  return (
    <div className="flex min-h-screen bg-[#F0F4FF]">
      {/* Desktop Sidebar — hidden on mobile */}
      <DesktopSidebar
        basePath={basePath}
        messageBadge={messageBadge}
        userName={user?.name}
        userRole={user?.role}
      />

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        {/* Mobile Top Header — shown only on mobile */}
        <header className="lg:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-blue-100/60 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #2952E8, #1A2DB8)' }}>
              <span className="text-white font-black text-xs">T</span>
            </div>
            <span className="font-black text-sm tracking-tight" style={{ fontFamily: 'var(--font-orbitron)', color: '#2952E8' }}>
              TUKOLA
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 capitalize">
              {user?.role}
            </span>
          </div>
        </header>

        {/* Content Area */}
        <div className="max-w-6xl mx-auto px-4 lg:px-8 py-4 lg:py-6 pb-24 lg:pb-6">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav — hidden on desktop */}
      <div className="lg:hidden">
        <MobileNav basePath={basePath} messageBadge={messageBadge} />
      </div>
    </div>
  );
}
