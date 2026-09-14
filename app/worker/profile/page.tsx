'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MapPin, Star, CheckCircle, Clock, Zap, LogOut, Edit2, ChevronRight, Plus, Settings, Bell, FileText, HelpCircle, MessageSquareHeart, Tag, Wallet } from 'lucide-react';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { useKola } from '@/lib/store';
import { useI18n } from '@/lib/i18n';
import { SKILL_GROUPS } from '@/lib/constants';
import { UploadImagePicker } from '@/components/UploadImagePicker';
import VerifiedBadge from '@/components/VerifiedBadge';

export default function WorkerProfilePage() {
  const { user, logout, updateUser } = useKola();
  const { t } = useI18n();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [avatar, setAvatar] = useState<string>(user?.avatar || '');
  const [about, setAbout] = useState(user?.about || '');
  const [selectedSkills, setSelectedSkills] = useState<string[]>(user?.skills || []);
  const [portfolioImages, setPortfolioImages] = useState<string[]>(user?.portfolioImages || []);
  const [momoPhone, setMomoPhone] = useState(user?.momoPayoutPhone ?? user?.phone ?? '');
  const [momoSaved, setMomoSaved] = useState(false);

  const profile = {
    // Honest trust surface: undefined rating = "New", never a fake 4.5.
    // Response time / last active are not measured yet — don't display invented values.
    rating: user?.rating,
    completedJobs: user?.completedJobs || 0,
    responseTime: user?.responseTime || null,
    lastActive: user?.lastActive || null,
    isVerified: user?.isVerified || false,
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const handleSave = () => {
    updateUser({ about, skills: selectedSkills, portfolioImages, avatar });
    setEditing(false);
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  return (
    <div className="pb-nav lg:pb-0">
      <MobileHeader title="Worker Profile" showShare showMore />

      <div className="px-4 lg:px-6 py-5 space-y-4 max-w-4xl lg:mx-auto">
        {/* Avatar + name */}
        <div className="flex flex-col items-center gap-3 animate-slide-up">
          <div className="relative">
            <div className="p-[3px] rounded-full" style={{ background: 'linear-gradient(135deg,#00C8FF,#2952E8,#1A2DB8)' }}>
              {avatar ? (
                <div className="w-24 h-24 rounded-full overflow-hidden shadow-lg" style={{ border: '2px solid rgba(41,82,232,0.2)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-white font-black text-3xl">
                    {user?.name?.charAt(0).toUpperCase() || 'K'}
                  </span>
                </div>
              )}
            </div>
            {profile.isVerified && (
              <div className="absolute bottom-0 right-0 w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center border-2 border-white">
                <CheckCircle size={14} className="text-white" strokeWidth={2.5} />
              </div>
            )}
            <button
              onClick={() => document.getElementById('avatar-input')?.click()}
              className="absolute -bottom-1 -right-1 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md border border-slate-100 hover:bg-blue-50 transition-colors"
            >
              <Edit2 size={13} color="#2952E8" />
            </button>
            <input
              id="avatar-input"
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
            <h2 className="text-xl font-black text-slate-900">{user?.name || 'Your Name'}</h2>
            <p className="flex items-center justify-center gap-1 text-slate-500 text-sm mt-0.5">
              <MapPin size={13} />
              {user?.location || 'Kampala, Uganda'}
            </p>
            {/* ID-verified chip — only when the admin team set the flag */}
            {profile.isVerified && (
              <div className="flex justify-center mt-2">
                <VerifiedBadge variant="full" />
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-slide-up-d1">
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm text-center hover:shadow-[0_8px_30px_rgba(41,82,232,0.12)] transition-shadow">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Star size={16} className="text-yellow-500 fill-yellow-500" />
              <span className="text-2xl font-black text-slate-900">{profile.rating != null && profile.rating > 0 ? profile.rating.toFixed(1) : '—'}</span>
            </div>
            <p className="text-slate-500 text-xs">{profile.rating != null && profile.rating > 0 ? 'Rating' : 'No ratings yet'}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm text-center hover:shadow-[0_8px_30px_rgba(41,82,232,0.12)] transition-shadow">
            <div className="flex items-center justify-center gap-1 mb-1">
              <CheckCircle size={16} className="text-blue-600" />
              <span className="text-2xl font-black text-slate-900">{profile.completedJobs}</span>
            </div>
            <p className="text-slate-500 text-xs">Completed</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-[0_8px_30px_rgba(41,82,232,0.12)] transition-shadow">
            <p className="text-slate-500 text-xs mb-1">Last Active</p>
            <p className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <Clock size={13} className="text-blue-500" />
              {profile.lastActive || 'Not tracked yet'}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-[0_8px_30px_rgba(41,82,232,0.12)] transition-shadow">
            <p className="text-slate-500 text-xs mb-1">Response Time</p>
            <p className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <Zap size={13} className="text-orange-500" />
              {profile.responseTime || 'Not measured yet'}
            </p>
          </div>
        </div>

        {/* Skills */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm animate-slide-up-d2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-[#0A0F2C]">My Skills</h3>
              {selectedSkills.length > 0 && (
                <p className="text-[#8B94B8] text-xs mt-0.5">{selectedSkills.length} skill{selectedSkills.length > 1 ? 's' : ''} selected</p>
              )}
            </div>
            <button
              onClick={() => setEditing(!editing)}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
              style={{ background: editing ? '#2952E8' : '#EEF2FF', color: editing ? '#fff' : '#2952E8' }}
            >
              <Edit2 size={11} />
              {editing ? 'Done' : 'Edit Skills'}
            </button>
          </div>

          {editing ? (
            <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
              {Object.entries(SKILL_GROUPS).map(([group, skills]) => (
                <div key={group}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#8B94B8] mb-2">{group}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {skills.map((skill: string) => {
                      const active = selectedSkills.includes(skill);
                      return (
                        <button key={skill} onClick={() => toggleSkill(skill)}
                          className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
                          style={{
                            background: active ? '#2952E8' : '#fff',
                            color: active ? '#fff' : '#4A5580',
                            borderColor: active ? '#2952E8' : '#E2E6F0',
                          }}>
                          {skill}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {selectedSkills.length > 0 ? selectedSkills.map(skill => (
                <span key={skill} className="px-3 py-1.5 rounded-full text-xs font-semibold"
                  style={{ background: '#EEF2FF', color: '#2952E8' }}>
                  {skill}
                </span>
              )) : (
                <button onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border-2 border-dashed transition-colors"
                  style={{ borderColor: '#D1D9FF', color: '#8B94B8' }}>
                  <Plus size={11} /> Add your skills
                </button>
              )}
            </div>
          )}
        </div>

        {/* About */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm animate-slide-up-d3">
          <h3 className="font-bold text-[#0A0F2C] mb-2">About {user?.name?.split(' ')[0]}</h3>
          {editing ? (
            <textarea
              value={about}
              onChange={e => setAbout(e.target.value)}
              rows={4}
              placeholder="Describe your experience and skills..."
              className="w-full text-[#0A0F2C] text-sm leading-relaxed rounded-xl p-3 focus:outline-none resize-none"
              style={{ border: '1.5px solid #E2E6F0' }}
              onFocus={e => e.target.style.borderColor = '#2952E8'}
              onBlur={e => e.target.style.borderColor = '#E2E6F0'}
            />
          ) : (
            <p className="text-[#4A5580] text-sm leading-relaxed">
              {about || 'Add a description about yourself to attract more employers.'}
            </p>
          )}
        </div>

        {/* Mobile Money payout number — without it a release can't pay the fundi */}
        <div
          className="bg-white rounded-2xl p-4 shadow-sm animate-slide-up-d3"
          style={{ border: user?.momoPayoutPhone ? '1px solid #F0F4FF' : '1.5px solid #FCD34D' }}
        >
          <h3 className="font-bold text-[#0A0F2C]">{t('prof.payoutTitle')}</h3>
          <p className="text-[#8B94B8] text-xs mt-0.5 mb-3">{t('prof.payoutSub')}</p>
          {!user?.momoPayoutPhone && (
            <p className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-3">
              {t('prof.payoutWarn')}
            </p>
          )}
          <div className="flex gap-2">
            <input
              type="tel"
              inputMode="tel"
              value={momoPhone}
              onChange={e => { setMomoPhone(e.target.value); setMomoSaved(false); }}
              placeholder={t('prof.payoutPh')}
              className="flex-1 min-w-0 text-[#0A0F2C] text-sm rounded-xl px-3 py-2.5 focus:outline-none"
              style={{ border: '1.5px solid #E2E6F0' }}
              onFocus={e => e.target.style.borderColor = '#2952E8'}
              onBlur={e => e.target.style.borderColor = '#E2E6F0'}
            />
            <button
              onClick={() => {
                // Empty string → server stores NULL (undefined keys are dropped by JSON)
                updateUser({ momoPayoutPhone: momoPhone.trim() });
                setMomoSaved(true);
                setTimeout(() => setMomoSaved(false), 2500);
              }}
              className="shrink-0 px-4 py-2.5 rounded-xl text-sm font-bold text-white active:scale-95 transition-transform"
              style={{ background: 'linear-gradient(135deg,#2952E8,#1A2DB8)' }}
            >
              {momoSaved ? t('prof.payoutSaved') : t('prof.payoutSave')}
            </button>
          </div>
        </div>

        {/* Portfolio */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-[#0A0F2C]">My Work Portfolio</h3>
              <p className="text-[#8B94B8] text-xs mt-0.5">Photos of your past work help employers trust you</p>
            </div>
            {portfolioImages.length > 0 && (
              <span className="text-[11px] font-bold px-2 py-1 rounded-full" style={{ background: '#EEF2FF', color: '#2952E8' }}>
                {portfolioImages.length} photo{portfolioImages.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <UploadImagePicker
            images={portfolioImages}
            onChange={setPortfolioImages}
            maxImages={12}
            bucket="job-images"
            folder={`portfolio/${user?.id || 'guest'}`}
            hint="Up to 12 photos"
          />
          {portfolioImages.length > 0 && !editing && (
            <button
              onClick={handleSave}
              className="mt-3 w-full py-2.5 rounded-xl text-sm font-bold active:scale-95 transition-all"
              style={{ background: 'linear-gradient(135deg,#2952E8,#1A2DB8)', color: '#fff', boxShadow: '0 4px 12px rgba(41,82,232,0.25)' }}>
              Save Portfolio
            </button>
          )}
        </div>

        {editing && (
          <button
            onClick={handleSave}
            className="w-full text-white rounded-2xl py-4 font-black text-base active:scale-95 transition-transform"
            style={{ background: 'linear-gradient(135deg,#2952E8,#1A2DB8)', boxShadow: '0 6px 20px rgba(41,82,232,0.35)' }}
          >
            Save Profile
          </button>
        )}

        {/* Settings */}
        <div className="bg-white rounded-2xl overflow-hidden"
          style={{ border: '1px solid rgba(41,82,232,0.08)', boxShadow: '0 2px 12px rgba(41,82,232,0.05)' }}>
          {[
            { label: 'My Wallet',           icon: Wallet,     href: '/wallet' },
            { label: 'My Services & Prices', icon: Tag,        href: '/worker/services' },
            { label: 'Account Settings',  icon: Settings,   href: '/worker/profile' },
            { label: 'Notifications',      icon: Bell,       href: '/worker/messages' },
            { label: 'Send Feedback',      icon: MessageSquareHeart, href: '/feedback' },
            { label: 'Privacy Policy',     icon: FileText,   href: '/privacy' },
            { label: 'Help & Support',     icon: HelpCircle, href: '/help' },
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

        {/* Logout */}
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
