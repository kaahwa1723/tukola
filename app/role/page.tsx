'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Briefcase, UserSearch, ShieldCheck } from 'lucide-react';
import { useKola } from '@/lib/store';
import { TukolaLogo } from '@/components/TukolaLogo';

export default function RoleSelectionPage() {
  const [selected, setSelected] = useState<'worker' | 'employer' | null>(null);
  const [name, setName] = useState('');
  const [step, setStep] = useState<'role' | 'name'>('role');
  const [loading, setLoading] = useState(false);
  const { login } = useKola();
  const router = useRouter();

  const phone =
    typeof window !== 'undefined' ? localStorage.getItem('kola_phone') || '+256000000000' : '+256000000000';

  const handleRoleSelect = (role: 'worker' | 'employer') => {
    setSelected(role);
    setTimeout(() => setStep('name'), 150);
  };

  const handleContinue = () => {
    if (!name.trim() || !selected) return;
    setLoading(true);
    setTimeout(() => {
      login(phone, name.trim(), selected);
      router.push(selected === 'worker' ? '/worker' : '/employer');
    }, 800);
  };

  if (step === 'name') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
        {/* Desktop left panel */}
        <div className="hidden lg:flex lg:w-[40%] xl:w-[35%] relative overflow-hidden items-center justify-center"
          style={{ background: 'linear-gradient(160deg, #00C8FF 0%, #2952E8 55%, #1A2DB8 100%)' }}>
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />
          <div className="relative z-10 text-center px-8">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-5 backdrop-blur-sm"
              style={{ border: '1px solid rgba(255,255,255,0.2)' }}>
              {selected === 'worker' ? (
                <Briefcase size={28} className="text-white" />
              ) : (
                <UserSearch size={28} className="text-white" />
              )}
            </div>
            <h2 className="text-2xl font-black text-white mb-2">
              {selected === 'worker' ? 'Welcome, Worker!' : 'Welcome, Employer!'}
            </h2>
            <p className="text-white/70 text-sm">
              {selected === 'worker' ? 'Let employers know who you are.' : 'Let workers know who you are.'}
            </p>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center px-6 py-16 lg:px-12 lg:py-16">
          <div className="max-w-md mx-auto w-full">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${
              selected === 'worker' ? 'bg-blue-600' : 'bg-blue-600'
            }`}>
              {selected === 'worker' ? (
                <Briefcase size={28} className="text-white" />
              ) : (
                <UserSearch size={28} className="text-white" />
              )}
            </div>

            <h2 className="text-2xl font-black text-slate-900 mb-2">What&apos;s your name?</h2>
            <p className="text-slate-500 text-sm mb-8">
              This is how {selected === 'worker' ? 'employers' : 'workers'} will see you on Kola.
            </p>

            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={selected === 'worker' ? 'e.g. Peter Mukasa' : 'e.g. Mukasa John'}
              autoFocus
              className="w-full border-2 border-slate-200 rounded-2xl px-4 py-4 text-slate-900 text-lg font-semibold placeholder-slate-400 focus:border-blue-500 focus:ring-0 transition-colors bg-white mb-6"
            />

            <button
              onClick={handleContinue}
              disabled={!name.trim() || loading}
              className={`w-full py-4 rounded-2xl font-bold text-base transition-all active:scale-95 ${
                name.trim()
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {loading ? 'Setting up your account...' : `Continue as ${selected === 'worker' ? 'Worker' : 'Employer'}`}
            </button>

            <button
              onClick={() => setStep('role')}
              className="text-slate-400 text-sm text-center mt-4 active:opacity-70 w-full"
            >
              ← Change role
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Desktop left panel */}
      <div className="hidden lg:flex lg:w-[40%] xl:w-[35%] relative overflow-hidden items-center justify-center"
        style={{ background: 'linear-gradient(160deg, #00C8FF 0%, #2952E8 55%, #1A2DB8 100%)' }}>
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />
        <div className="relative z-10 text-center px-8">
          <TukolaLogo variant="mark" size="lg" />
          <div className="mt-3">
            <TukolaLogo variant="wordmark" size="md" onDark={true} />
          </div>
          <p className="text-white/60 text-xs font-semibold tracking-wider uppercase mt-4">Uganda&apos;s #1 Gig Platform</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="px-5 lg:px-12 pt-12 lg:pt-16 pb-4 flex items-center">
          <TukolaLogo variant="full" size="sm" />
        </div>

        <div className="px-5 lg:px-12 pt-2 pb-6">
          <h1 className="text-2xl font-black text-[#0A0F2C] mb-1.5">Welcome to TUKOLA</h1>
          <p className="text-[#4A5580] text-sm">Choose how you want to use the platform today.</p>
        </div>

        {/* Role cards */}
        <div className="px-5 lg:px-12 space-y-4 flex-1 max-w-2xl">
          {/* Worker card */}
          <button
            onClick={() => handleRoleSelect('worker')}
            className={`w-full text-left bg-white rounded-2xl p-5 lg:p-6 border-2 transition-all active:scale-[0.98] shadow-sm ${
              selected === 'worker' ? 'border-blue-600 shadow-blue-100' : 'border-slate-100'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Briefcase size={26} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-black text-slate-900 mb-1">I need Work</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Browse available jobs, apply for gigs, and earn money for your skills.
                </p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {['Cleaning', 'Plumbing', 'Moving', 'Building'].map(tag => (
                    <span key={tag} className="text-[11px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </button>

          {/* Employer card */}
          <button
            onClick={() => handleRoleSelect('employer')}
            className={`w-full text-left bg-white rounded-2xl p-5 lg:p-6 border-2 transition-all active:scale-[0.98] shadow-sm ${
              selected === 'employer' ? 'border-blue-600 shadow-blue-100' : 'border-slate-100'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center flex-shrink-0">
                <UserSearch size={26} className="text-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-black text-slate-900 mb-1">I want to Hire</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Post a job description, find reliable workers, and get your tasks done.
                </p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {['Post Jobs', 'Quick Hiring', 'Rated Workers'].map(tag => (
                    <span key={tag} className="text-[11px] bg-orange-50 text-orange-500 px-2 py-0.5 rounded-full font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="px-5 lg:px-12 pb-10 pt-6 flex items-center justify-center gap-2 text-xs" style={{ color: '#8B94B8' }}>
          <ShieldCheck size={14} />
          <span>Secured by TUKOLA Trust Network</span>
        </div>
      </div>
    </div>
  );
}
