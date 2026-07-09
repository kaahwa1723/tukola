'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Briefcase, MessageCircle, User } from 'lucide-react';

interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
  badge?: number;
}

interface MobileNavProps {
  basePath: 'worker' | 'employer';
  messageBadge?: number;
}

export function MobileNav({ basePath, messageBadge = 0 }: MobileNavProps) {
  const pathname = usePathname();

  const items: NavItem[] = [
    { href: `/${basePath}`, icon: Home, label: 'Home' },
    { href: `/${basePath}/jobs`, icon: Briefcase, label: 'My Jobs' },
    { href: `/${basePath}/messages`, icon: MessageCircle, label: 'Messages', badge: messageBadge },
    { href: `/${basePath}/profile`, icon: User, label: 'Profile' },
  ];

  const isActive = (href: string) => {
    if (href === `/${basePath}`) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <nav className="mobile-nav fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50">
      <div className="flex items-center justify-around px-1 py-2">
        {items.map(item => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 py-1 px-5 rounded-2xl transition-all duration-200 relative"
            >
              {active && (
                <div className="absolute inset-0 rounded-2xl"
                  style={{ background: 'linear-gradient(135deg, rgba(0,200,255,0.12), rgba(41,82,232,0.15))' }} />
              )}
              <div className="relative z-10">
                <div className={`transition-all duration-200 ${active ? 'scale-110' : 'scale-100'}`}>
                  <Icon
                    size={22}
                    strokeWidth={active ? 2.5 : 1.8}
                    color={active ? '#2952E8' : '#94a3b8'}
                  />
                </div>
                {item.badge && item.badge > 0 ? (
                  <span className="absolute -top-1.5 -right-1.5 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-sm"
                    style={{ background: 'linear-gradient(135deg, #ff4d4d, #ff1a1a)' }}>
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                ) : null}
              </div>
              <span className={`text-[10px] leading-none z-10 relative font-semibold transition-colors ${active ? 'text-[#2952E8]' : 'text-slate-400'}`}>
                {item.label}
              </span>
              {active && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                  style={{ background: '#2952E8' }} />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
