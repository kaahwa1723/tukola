'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Users, Briefcase, Flag, Shield, ShieldCheck, BarChart2, LogOut, Gift, ShieldAlert } from 'lucide-react';
import { TukolaLogo } from '@/components/TukolaLogo';

const NAV = [
  { href: '/admin',           label: 'Overview',   Icon: LayoutDashboard },
  { href: '/admin/users',     label: 'Users',      Icon: Users },
  { href: '/admin/jobs',      label: 'Jobs',       Icon: Briefcase },
  { href: '/admin/disputes',  label: 'Disputes',   Icon: Flag },
  { href: '/admin/claims',    label: 'Claims',     Icon: ShieldCheck },
  { href: '/admin/referrals', label: 'Referrals',  Icon: Gift },
  { href: '/admin/leakage',   label: 'Leakage',    Icon: ShieldAlert },
  { href: '/admin/analytics', label: 'Analytics',  Icon: BarChart2 },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    // Skip auth check on login page
    if (pathname === '/admin/login') { setAuthed(true); return; }
    const ok = sessionStorage.getItem('tukola_admin_auth') === '1';
    if (!ok) { router.replace('/admin/login'); } else { setAuthed(true); }
  }, [pathname, router]);

  const handleLogout = () => {
    sessionStorage.removeItem('tukola_admin_auth');
    router.push('/admin/login');
  };

  // Don't render the shell on the login page or while checking auth
  if (pathname === '/admin/login') return <>{children}</>;
  if (!authed) return null;

  return (
    <div className="min-h-screen flex" style={{ background: '#F4F6FB' }}>

      {/* ── Sidebar (desktop) ─────────────────────────────────────────── */}
      <aside className="w-60 min-h-screen flex-col hidden md:flex"
        style={{ background: 'linear-gradient(180deg,#0A0F2C 0%,#1A2DB8 100%)' }}>

        {/* Logo */}
        <div className="px-5 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <TukolaLogo variant="full" size="sm" />
          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(0,200,255,0.12)' }}>
            <Shield size={11} color="#00C8FF" />
            <span className="text-[11px] font-bold" style={{ color: '#00C8FF' }}>Admin Portal</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-1 px-3">
          {NAV.map(({ href, label, Icon }) => {
            const active = pathname === href || (href !== '/admin' && pathname.startsWith(href));
            return (
              <Link key={href} href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
                  color:      active ? '#fff' : 'rgba(255,255,255,0.5)',
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <Icon size={17} />
                {label}
                {active && <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: '#00C8FF' }} />}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="px-3 pb-5 space-y-1" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px' }}>
          <Link href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            style={{ color: 'rgba(255,255,255,0.4)' }}>
            ← Back to App
          </Link>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors text-left"
            style={{ color: 'rgba(239,68,68,0.7)' }}>
            <LogOut size={17} /> Sign Out
          </button>
        </div>
      </aside>

      {/* ── Mobile top bar ─────────────────────────────────────────────── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3"
        style={{ background: 'linear-gradient(135deg,#0A0F2C,#1A2DB8)' }}>
        <TukolaLogo variant="wordmark" size="sm" />
        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(0,200,255,0.15)', color: '#00C8FF' }}>Admin</span>
      </div>

      {/* ── Mobile bottom nav ──────────────────────────────────────────── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex"
        style={{ background: 'linear-gradient(135deg,#0A0F2C,#1A2DB8)', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        {NAV.map(({ href, label, Icon }) => {
          const active = pathname === href || (href !== '/admin' && pathname.startsWith(href));
          return (
            <Link key={href} href={href}
              className="flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-semibold transition-colors"
              style={{ color: active ? '#00C8FF' : 'rgba(255,255,255,0.4)' }}>
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </div>

      {/* ── Main content ───────────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto pb-20 pt-14 md:pt-0 md:pb-0">
        {children}
      </main>
    </div>
  );
}
