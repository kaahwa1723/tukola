'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Shield, Check } from 'lucide-react';
import { useKola } from '@/lib/store';

export default function VerifyPage() {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);
  const [phone, setPhone] = useState('+256...');
  const [devCode, setDevCode] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const router = useRouter();
  const { setSessionUser } = useKola();

  useEffect(() => {
    // Read after mount so SSR HTML matches first client render (no hydration error).
    const stored = localStorage.getItem('kola_phone');
    if (stored) setPhone(stored);
    try {
      const code = sessionStorage.getItem('kola_dev_code');
      if (code) setDevCode(code);
    } catch {}
    inputRefs.current[0]?.focus();
  }, []);

  const handleDigit = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const updated = [...digits];
    updated[index] = value;
    setDigits(updated);
    setError('');

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    if (value && index === 5) {
      handleVerify([...updated]);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (code = digits) => {
    const otp = code.join('');
    if (otp.length < 6) {
      setError('Enter the full 6-digit code');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: otp }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error ?? 'Verification failed. Please try again.');
        setLoading(false);
        return;
      }

      try { sessionStorage.removeItem('kola_dev_code'); } catch {}

      if (data?.isNewUser) {
        // New phone — collect name + role, then /api/auth/register
        router.push('/role');
        return;
      }

      // Returning user — the server resumed their existing account and
      // issued a session; adopt the canonical profile
      if (data?.user) {
        setSessionUser(data.user);
        router.push(data.user.role === 'worker' ? '/worker' : '/employer');
        return;
      }

      setError('Unexpected response. Please try again.');
      setLoading(false);
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResent(true);
    setDigits(['', '', '', '', '', '']);
    setError('');
    inputRefs.current[0]?.focus();
    try {
      const res = await fetch('/api/auth/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json().catch(() => null);
      if (data?.devCode) {
        setDevCode(data.devCode);
        try { sessionStorage.setItem('kola_dev_code', data.devCode); } catch {}
      }
      if (!res.ok) setError(data?.error ?? 'Could not resend the code.');
    } catch {
      setError('Network error. Please try again.');
    }
    setTimeout(() => setResent(false), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Desktop left panel */}
      <div className="hidden lg:flex lg:w-[40%] xl:w-[35%] relative overflow-hidden items-center justify-center"
        style={{ background: 'linear-gradient(160deg, #00C8FF 0%, #2952E8 55%, #1A2DB8 100%)' }}>
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />
        <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #00C8FF 0%, transparent 70%)' }} />
        <div className="relative z-10 text-center px-8">
          <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center mx-auto mb-5 backdrop-blur-sm"
            style={{ border: '1px solid rgba(255,255,255,0.2)' }}>
            <Shield size={36} className="text-white" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">Secure Verification</h2>
          <p className="text-white/70 text-sm">We verify every user to keep the platform safe and trusted.</p>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-50 active:bg-slate-100"
          >
            <ChevronLeft size={24} className="text-blue-600" />
          </button>
          <span className="text-blue-600 font-bold text-lg">Verify Number</span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-20 lg:pb-0">
          {/* Icon */}
          <div className="w-20 h-20 bg-blue-100 rounded-3xl flex items-center justify-center mb-6 lg:mb-8">
            <Shield size={36} className="text-blue-600" />
          </div>

          <h2 className="text-2xl font-black text-slate-900 text-center mb-2">Enter your code</h2>
          <p className="text-slate-500 text-sm text-center mb-1">
            We sent a 6-digit code to
          </p>
          <p className="text-slate-800 font-bold text-center mb-8">{phone}</p>

          {/* OTP inputs */}
          <div className="flex gap-2 mb-5">
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={el => { inputRefs.current[i] = el; }}
                type="tel"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleDigit(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                className={`w-12 h-14 lg:w-14 lg:h-16 text-center text-xl font-black rounded-2xl border-2 focus:outline-none transition-all ${
                  digit
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : error
                    ? 'border-red-400 bg-red-50'
                    : 'border-slate-200 bg-white text-slate-900 focus:border-blue-400 focus:bg-blue-50'
                }`}
              />
            ))}
          </div>

          {error && (
            <p className="text-red-500 text-sm font-medium mb-4">{error}</p>
          )}

          {resent && (
            <p className="text-green-600 text-sm font-medium mb-4 flex items-center gap-1">
              <Check size={14} strokeWidth={3} /> Code resent!
            </p>
          )}

          {/* Demo hint — mock SMS provider in non-production only.
              NEVER rendered in production builds. */}
          {process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && devCode && (
            <p className="text-slate-400 text-xs text-center mb-6 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2">
              Demo code: <span className="font-bold tracking-widest">{devCode}</span>
            </p>
          )}

          <button
            onClick={() => handleVerify()}
            disabled={loading || digits.join('').length < 6}
            className={`w-full max-w-sm py-4 rounded-2xl font-bold text-base transition-all active:scale-95 ${
              digits.join('').length === 6 && !loading
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Verifying...
              </span>
            ) : (
              'Verify & Continue'
            )}
          </button>

          <button
            onClick={handleResend}
            className="mt-4 text-blue-600 text-sm font-semibold active:opacity-70"
          >
            Didn&apos;t get a code? Resend
          </button>
        </div>
      </div>
    </div>
  );
}
