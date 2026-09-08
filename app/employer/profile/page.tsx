'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MapPin, Briefcase, LogOut, ChevronRight, Edit2, Building2, Phone, CheckCircle, Settings, FileText, HelpCircle, Users, Star } from 'lucide-react';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { useKola } from '@/lib/store';

export default function EmployerProfilePage() {
  const { user, jobs, logout, updateUser } = useKola();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [avatar, setAvatar] = useState<string>(user?.avatar || '');
  const [company, setCompany] = useState(user?.company || '');
  const [about, setAbout] = useState(user?.about || '');

  // Real stats computed from the employer's own jobs
  const myJobs = jobs.filter(j => j.employerId === user?.id);
  const postedCount = myJobs.length;
  const completedCount = myJobs.filter(j => j.status === 'completed').length;
  const hiredCount = myJobs.reduce(
    (n, j) => n + j.applicants.filter(a => a.status === 'accepted').length, 0
  );
  const rating = user?.rating ?? 4.5;

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const handleSave = () => {
    updateUser({ company, about, avatar });
    setEditing(false);
  };

  return (
    <div className="pb-nav lg:pb-0">
      <MobileHeader title="Profile" showMore />

      <div className="px-4 lg:px-6 py-5 space-y-4 max-w-4xl lg:mx-auto">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="p-[3px] rounded-full" style={{ background: 'linear-gradient(135deg,#00C8FF,#2952E8,#1A2DB8)' }}>
              {avatar ? (
                <div className="w-24 h-24 rounded-full overflow-hidden shadow-lg" style={{ border: '2px solid rgba(41,82,232,0.2)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-24 h-24 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-white font-black text-3xl">
                    {user?.name?.charAt(0).toUpperCase() || 'E'}
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={() => document.getElementById('employer-avatar-input')?.click()}
              className="absolute -bottom-1 -right-1 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md border border-slate-100 hover:bg-blue-50 transition-colors"
            >
              <Edit2 size={13} color="#2952E8" />
            </button>
            <input
              id="employer-avatar-input"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const formData = new FormData();
                formData.append('file', file);
                formData.append('bucket', 'profile-images');
                formData.append('folder', `avatars/${user?.id || 'guest'}`);
                try {
                  const res = await fetch('/api/upload', { method: 'POST', body: formData });
                  if (!res.ok) throw new Error('Upload failed');
                  const { url } = await res.json();
                  setAvatar(url);
                } catch (err) {
                  console.error('[avatar upload]', err);
                }
                e.target.value = '';
              }}
            />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-black text-slate-900">{user?.name || 'Employer'}</h2>
            <p className="flex items-center justify-center gap-1.5 text-slate-500 text-sm mt-0.5">
              <MapPin size={13} />
              {user?.location || 'Kampala, Uganda'}
            </p>
            {company && (
              <p className="flex items-center justify-center gap-1.5 text-blue-600 text-sm font-semibold mt-1">
                <Building2 size={13} />
                {company}
              </p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-2xl p-4 text-center hover:shadow-[0_8px_30px_rgba(41,82,232,0.12)] transition-shadow" style={{ background: '#EEF2FF', border: '1px solid rgba(41,82,232,0.1)' }}>
            <div className="flex items-center justify-center gap-1 mb-1">
              <Briefcase size={16} color="#2952E8" strokeWidth={2} />
              <span className="text-2xl font-black" style={{ color: '#0A0F2C' }}>{postedCount}</span>
            </div>
            <p className="text-xs font-semibold" style={{ color: '#4A5580' }}>Jobs Posted</p>
          </div>
          <div className="rounded-2xl p-4 text-center hover:shadow-[0_8px_30px_rgba(41,82,232,0.12)] transition-shadow" style={{ background: '#ECFDF5', border: '1px solid rgba(5,150,105,0.1)' }}>
            <div className="flex items-center justify-center gap-1 mb-1">
              <CheckCircle size={16} color="#059669" strokeWidth={2} />
              <span className="text-2xl font-black" style={{ color: '#0A0F2C' }}>{completedCount}</span>
            </div>
            <p className="text-xs font-semibold" style={{ color: '#4A5580' }}>Completed</p>
          </div>
          <div className="rounded-2xl p-4 text-center hover:shadow-[0_8px_30px_rgba(41,82,232,0.12)] transition-shadow" style={{ background: '#FEF3C7', border: '1px solid rgba(217,119,6,0.1)' }}>
            <div className="flex items-center justify-center gap-1 mb-1">
              <Star size={16} color="#D97706" strokeWidth={2} />
              <span className="text-2xl font-black" style={{ color: '#0A0F2C' }}>{rating}</span>
            </div>
            <p className="text-xs font-semibold" style={{ color: '#4A5580' }}>Avg Rating</p>
          </div>
          <div className="rounded-2xl p-4 text-center hover:shadow-[0_8px_30px_rgba(41,82,232,0.12)] transition-shadow" style={{ background: '#F3E8FF', border: '1px solid rgba(147,51,234,0.1)' }}>
            <div className="flex items-center justify-center gap-1 mb-1">
              <Users size={16} color="#9333EA" strokeWidth={2} />
              <span className="text-2xl font-black" style={{ color: '#0A0F2C' }}>{hiredCount}</span>
            </div>
            <p className="text-xs font-semibold" style={{ color: '#4A5580' }}>Workers Hired</p>
          </div>
        </div>

        {/* Contact */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-3">Contact Info</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
                <Phone size={14} className="text-blue-600" />
              </div>
              <span className="text-slate-700 text-sm font-medium">{user?.phone || '+256 700 000 000'}</span>
            </div>
          </div>
        </div>

        {/* About / Company */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-900">About</h3>
            <button
              onClick={() => setEditing(!editing)}
              className="text-blue-600 text-sm font-semibold flex items-center gap-1"
            >
              <Edit2 size={13} />
              {editing ? 'Cancel' : 'Edit'}
            </button>
          </div>

          {editing ? (
            <div className="space-y-3">
              <div>
                <label className="text-slate-600 text-xs font-semibold mb-1 block">Company Name</label>
                <input
                  type="text"
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                  placeholder="Your company or business name"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-slate-600 text-xs font-semibold mb-1 block">Description</label>
                <textarea
                  value={about}
                  onChange={e => setAbout(e.target.value)}
                  rows={3}
                  placeholder="Describe your business..."
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
              <button
                onClick={handleSave}
                className="w-full bg-blue-600 text-white rounded-xl py-3 font-bold text-sm"
              >
                Save Changes
              </button>
            </div>
          ) : (
            <p className="text-slate-600 text-sm leading-relaxed">
              {about || 'Add a description about your business to attract better workers.'}
            </p>
          )}
        </div>

        {/* Settings */}
        <div className="bg-white rounded-2xl overflow-hidden"
          style={{ border: '1px solid rgba(41,82,232,0.08)', boxShadow: '0 2px 12px rgba(41,82,232,0.05)' }}>
          {[
            { label: 'Account Settings',  icon: Settings,   href: '/employer/profile' },
            { label: 'My Posted Jobs',     icon: Briefcase,  href: '/employer/jobs' },
            { label: 'Privacy Policy',     icon: FileText,   href: '/' },
            { label: 'Help & Support',     icon: HelpCircle, href: '/' },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <Link key={item.label} href={item.href}
                className={`flex items-center justify-between px-4 py-4 active:bg-[#F7F9FF] transition-colors ${
                  i > 0 ? 'border-t border-[#F0F4FF]' : ''
                }`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#EEF2FF' }}>
                    <Icon size={15} color="#2952E8" strokeWidth={2} />
                  </div>
                  <span className="text-[#0A0F2C] font-semibold text-sm">{item.label}</span>
                </div>
                <ChevronRight size={15} color="#8B94B8" />
              </Link>
            );
          })}
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black active:scale-95 transition-transform"
          style={{ background: '#FEF2F2', color: '#DC2626', border: '1.5px solid rgba(220,38,38,0.15)' }}
        >
          <LogOut size={17} strokeWidth={2.5} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
