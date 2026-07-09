'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home, Briefcase, MessageCircle, User, Plus,
  LayoutDashboard, Settings, LogOut, Bell, Menu, X
} from 'lucide-react';
import { useState } from 'react';

interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
  badge?: boolean;
  accent?: boolean;
}

interface SidebarProps {
  basePath: 'worker' | 'employer';
  messageBadge?: number;
  userName?: string;
  userRole?: string;
}

const WORKER_ITEMS: NavItem[] = [
  { href: '/worker', icon: Home, label: 'Home' },
  { href: '/worker/jobs', icon: Briefcase, label: 'My Jobs' },
  { href: '/worker/messages', icon: MessageCircle, label: 'Messages', badge: true },
  { href: '/worker/profile', icon: User, label: 'Profile' },
];

const EMPLOYER_ITEMS: NavItem[] = [
  { href: '/employer', icon: Home, label: 'Home' },
  { href: '/employer/jobs', icon: Briefcase, label: 'My Jobs' },
  { href: '/employer/post-job', icon: Plus, label: 'Post Job', accent: true },
  { href: '/employer/messages', icon: MessageCircle, label: 'Messages', badge: true },
  { href: '/employer/profile', icon: User, label: 'Profile' },
];

export function DesktopSidebar({ basePath, messageBadge = 0, userName, userRole }: SidebarProps) {
  const pathname = usePathname();
  const items = basePath === 'worker' ? WORKER_ITEMS : EMPLOYER_ITEMS;
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string) => {
    if (href === `/${basePath}`) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={`hidden lg:flex flex-col h-screen sticky top-0 bg-white border-r border-blue-100/60 transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'}`}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-blue-100/40">
        <Link href={`/${basePath}`} className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #2952E8, #1A2DB8)' }}>
            <span className="text-white font-black text-sm">T</span>
          </div>
          {!collapsed && (
            <span className="font-black text-lg tracking-tight" style={{ fontFamily: 'var(--font-orbitron)', color: '#2952E8' }}>
              TUKOLA
            </span>
          )}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto w-8 h-8 rounded-lg flex items-center justify-center hover:bg-blue-50 transition-colors"
        >
          {collapsed ? <Menu size={16} color="#4A5580" /> : <X size={16} color="#4A5580" />}
        </button>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative ${
                active
                  ? 'bg-blue-50 text-blue-600 font-semibold'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              } ${item.accent && !active ? 'bg-blue-50/50 text-blue-600 hover:bg-blue-100' : ''}`}
            >
              <div className="relative">
                <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                {item.badge && messageBadge > 0 && !collapsed && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {messageBadge > 9 ? '9+' : messageBadge}
                  </span>
                )}
              </div>
              {!collapsed && (
                <>
                  <span className="text-sm">{item.label}</span>
                  {item.badge && messageBadge > 0 && (
                    <span className="ml-auto text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full">
                      {messageBadge}
                    </span>
                  )}
                </>
              )}
              {active && !collapsed && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full bg-blue-600" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Card */}
      <div className="p-3 border-t border-blue-100/40">
        <div className={`flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #2952E8, #1A2DB8)' }}>
            <span className="text-white font-bold text-sm">{userName?.charAt(0) || 'U'}</span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{userName || 'User'}</p>
              <p className="text-xs text-slate-400 capitalize">{userRole || 'Worker'}</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
