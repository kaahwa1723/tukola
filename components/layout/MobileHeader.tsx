'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, ChevronLeft, Share2, MoreVertical, LogOut, User, Settings, X } from 'lucide-react';
import { useKola } from '@/lib/store';

interface MoreAction {
  label: string;
  icon?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  danger?: boolean;
}

interface MobileHeaderProps {
  title?: string;
  showBack?: boolean;
  backHref?: string;
  showNotification?: boolean;
  notificationCount?: number;
  showAvatar?: boolean;
  avatarInitials?: string;
  rightElement?: React.ReactNode;
  showShare?: boolean;
  showMore?: boolean;
  moreActions?: MoreAction[];
  className?: string;
}

export function MobileHeader({
  title,
  showBack = false,
  backHref,
  showNotification = false,
  notificationCount = 0,
  showAvatar = false,
  avatarInitials = 'K',
  rightElement,
  showShare = false,
  showMore = false,
  moreActions,
  className = '',
}: MobileHeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { logout } = useKola();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  const defaultMoreActions: MoreAction[] = [
    { label: 'Edit Profile', icon: <User size={15} />, href: '#' },
    { label: 'Settings',     icon: <Settings size={15} />, href: '#' },
    {
      label: 'Sign Out', icon: <LogOut size={15} />, danger: true,
      onClick: () => { logout(); router.push('/'); },
    },
  ];

  const actions = moreActions || defaultMoreActions;

  return (
    <header className={`sticky top-0 z-40 px-4 h-14 flex items-center justify-between ${className}`}
      style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(41,82,232,0.07)' }}>

      <div className="flex items-center gap-2 min-w-0">
        {showBack && (
          <Link href={backHref || '/'}
            className="w-9 h-9 flex items-center justify-center -ml-1.5 rounded-xl active:bg-gray-100 transition-colors flex-shrink-0">
            <ChevronLeft size={22} color="#2952E8" strokeWidth={2.5} />
          </Link>
        )}
        {showAvatar && (
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#00C8FF,#2952E8)' }}>
            <span className="text-white font-bold text-xs">{avatarInitials}</span>
          </div>
        )}
        <span className="font-black text-base truncate" style={{ color: '#0A0F2C' }}>{title || 'TUKOLA'}</span>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        {rightElement}

        {showShare && (
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: 'TUKOLA', url: window.location.href }).catch(() => {});
              } else {
                navigator.clipboard?.writeText(window.location.href);
              }
            }}
            className="w-9 h-9 flex items-center justify-center rounded-xl active:bg-gray-100 transition-colors">
            <Share2 size={17} color="#4A5580" strokeWidth={2} />
          </button>
        )}

        {showNotification && (
          <button className="w-9 h-9 flex items-center justify-center rounded-xl active:bg-gray-100 transition-colors relative">
            <Bell size={19} color="#4A5580" strokeWidth={2} />
            {notificationCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white"
                style={{ background: '#DC2626' }}>{notificationCount > 9 ? '9+' : notificationCount}</span>
            )}
          </button>
        )}

        {showMore && (
          <div className="relative" ref={dropdownRef}>
            <button onClick={() => setDropdownOpen(v => !v)}
              className="w-9 h-9 flex items-center justify-center rounded-xl active:bg-gray-100 transition-colors"
              style={{ background: dropdownOpen ? '#EEF2FF' : 'transparent' }}>
              {dropdownOpen
                ? <X size={17} color="#2952E8" strokeWidth={2.5} />
                : <MoreVertical size={17} color="#4A5580" strokeWidth={2} />}
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-44 rounded-2xl shadow-xl overflow-hidden z-50"
                style={{ background: '#fff', border: '1px solid rgba(41,82,232,0.1)', boxShadow: '0 8px 32px rgba(41,82,232,0.14)' }}>
                {actions.map((action, i) => {
                  const content = (
                    <div className="flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-colors active:bg-gray-50"
                      style={{ color: action.danger ? '#DC2626' : '#0A0F2C', borderTop: i > 0 ? '1px solid #F0F4FF' : 'none' }}>
                      <span style={{ color: action.danger ? '#DC2626' : '#8B94B8' }}>{action.icon}</span>
                      {action.label}
                    </div>
                  );
                  if (action.onClick) {
                    return <button key={action.label} onClick={() => { setDropdownOpen(false); action.onClick!(); }} className="w-full text-left">{content}</button>;
                  }
                  return <Link key={action.label} href={action.href || '#'} onClick={() => setDropdownOpen(false)}>{content}</Link>;
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
