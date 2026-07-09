'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { TukolaLogo } from '@/components/TukolaLogo';

export default function AdminLoginPage() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();

      if (data.valid) {
        sessionStorage.setItem('tukola_admin_auth', '1');
        router.push('/admin');
      } else {
        setError('Incorrect PIN. Please try again.');
        setPin('');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg,#0A0F2C 0%,#1A2DB8 60%,#2952E8 100%)' }}>

      {/* Ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle,#00C8FF,transparent)' }} />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Card */}
        <div className="rounded-3xl p-8"
          style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.12)' }}>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <TukolaLogo variant="full" size="md" />
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-3"
              style={{ background: 'rgba(255,255,255,0.1)' }}>
              <ShieldCheck size={13} color="#00C8FF" />
              <span className="text-xs font-bold text-white/80">Admin Portal</span>
            </div>
            <h1 className="text-2xl font-black text-white">Secure Access</h1>
            <p className="text-white/50 text-sm mt-1">Enter your admin PIN to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-white/70 text-xs font-semibold block mb-1.5">Admin PIN</label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  type={show ? 'text' : 'password'}
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                  placeholder="Enter PIN"
                  autoComplete="current-password"
                  className="w-full pl-11 pr-11 py-3.5 rounded-xl text-white text-sm placeholder-white/30 focus:outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: error ? '1.5px solid rgba(239,68,68,0.6)' : '1.5px solid rgba(255,255,255,0.12)',
                  }}
                  onFocus={e => { if (!error) e.target.style.borderColor = '#00C8FF'; }}
                  onBlur={e => { if (!error) e.target.style.borderColor = 'rgba(255,255,255,0.12)'; }}
                />
                <button type="button" onClick={() => setShow(!show)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors">
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {error && (
                <p className="mt-2 text-xs font-semibold" style={{ color: '#FF6B6B' }}>{error}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={!pin.trim() || loading}
              className="w-full py-3.5 rounded-xl font-black text-sm transition-all active:scale-95"
              style={{
                background: pin.trim() ? 'linear-gradient(135deg,#00C8FF,#2952E8)' : 'rgba(255,255,255,0.1)',
                color: pin.trim() ? '#fff' : 'rgba(255,255,255,0.3)',
                boxShadow: pin.trim() ? '0 6px 20px rgba(0,200,255,0.3)' : 'none',
              }}>
              {loading ? 'Verifying…' : 'Access Dashboard'}
            </button>
          </form>
        </div>

        <p className="text-center text-white/30 text-xs mt-6">
          TUKOLA Admin • Restricted Access
        </p>
      </div>
    </div>
  );
}
