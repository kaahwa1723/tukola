'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, CheckCircle, XCircle, Star, Briefcase, UserCheck, Ban, RefreshCw, Users } from 'lucide-react';

interface AdminUser {
  id: string; name: string; phone: string; role: string;
  location?: string; rating?: number; completedJobs?: number;
  reliabilityScore?: number;
  skills?: string[]; isVerified: boolean; blocked?: boolean;
  sex?: 'male' | 'female'; dateOfBirth?: string; createdAt?: string;
}

type Tab = 'all' | 'worker' | 'employer';

const TABS: { key: Tab; label: string }[] = [
  { key: 'all',      label: 'Everyone'  },
  { key: 'worker',   label: 'Workers'   },
  { key: 'employer', label: 'Employers' },
];

function ageFrom(dateOfBirth?: string): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const beforeBirthday =
    now.getMonth() < dob.getMonth() ||
    (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate());
  if (beforeBirthday) age -= 1;
  return age >= 0 && age < 120 ? age : null;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [tab, setTab]       = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [users, setUsers]   = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUsers = async (role: Tab) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users?role=${role}`);
      if (res.status === 401) { router.push('/admin/login'); return; }
      const data = await res.json();
      setUsers(data.users ?? []);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(tab); }, [tab]);

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.phone?.includes(search)
  );

  const patchUser = async (id: string, updates: Partial<AdminUser>) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (res.status === 401) router.push('/admin/login');
  };

  const tabLabel = TABS.find(t => t.key === tab)!.label.toLowerCase();
  const colCount = tab === 'worker' ? 10 : 8;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#0A0F2C]">Users</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {users.length} {tab === 'all' ? 'people' : tabLabel} registered
          </p>
        </div>
        <button onClick={() => loadUsers(tab)} disabled={loading}
          className="flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-xl transition-colors disabled:opacity-60"
          style={{ background: '#EEF2FF', color: '#2952E8' }}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Tabs + Search */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="flex bg-white rounded-xl border border-slate-200 p-1 shadow-sm">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-all active:scale-95"
              style={tab === t.key
                ? { background: '#2952E8', color: '#fff' }
                : { color: '#4A5580' }}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex-1 min-w-48 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or phone…"
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 shadow-sm" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw size={20} className="animate-spin mx-auto mb-2" />
            Loading users…
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Name</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold hidden md:table-cell">Phone</th>
                {tab === 'all' && (
                  <th className="text-left px-4 py-3 text-slate-600 font-semibold">Role</th>
                )}
                <th className="text-left px-4 py-3 text-slate-600 font-semibold hidden lg:table-cell">Sex</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold hidden lg:table-cell">Age</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold hidden md:table-cell">Joined</th>
                {tab === 'worker' && (
                  <>
                    <th className="text-left px-4 py-3 text-slate-600 font-semibold hidden md:table-cell">Rating</th>
                    <th className="text-left px-4 py-3 text-slate-600 font-semibold hidden lg:table-cell" title="Computed from completed jobs, disputes and cancellations — not editable">Trust Score</th>
                    <th className="text-left px-4 py-3 text-slate-600 font-semibold hidden md:table-cell">Jobs Done</th>
                  </>
                )}
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Status</th>
                <th className="text-right px-4 py-3 text-slate-600 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(user => {
                const age = ageFrom(user.dateOfBirth);
                return (
                <tr key={user.id} className={`table-row-hover transition-colors ${user.blocked ? 'bg-red-50/40' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: user.blocked ? '#FEE2E2' : 'linear-gradient(135deg,#2952E8,#1A2DB8)' }}>
                        <span className={`font-bold text-sm ${user.blocked ? 'text-red-400' : 'text-white'}`}>
                          {user.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className={`font-semibold text-sm ${user.blocked ? 'text-slate-400 line-through' : 'text-[#0A0F2C]'}`}>
                          {user.name}
                        </p>
                        <p className="text-slate-400 text-xs">{user.location || 'Kampala'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{user.phone}</td>
                  {tab === 'all' && (
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        user.role === 'worker' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                      }`}>
                        {user.role === 'worker' ? 'Worker' : 'Employer'}
                      </span>
                    </td>
                  )}
                  <td className="px-4 py-3 text-slate-600 hidden lg:table-cell">
                    {user.sex ? (user.sex === 'male' ? 'Male' : 'Female') : <span className="text-slate-400 text-xs">Not shared</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600 hidden lg:table-cell">
                    {age != null ? age : <span className="text-slate-400 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600 hidden md:table-cell whitespace-nowrap">
                    {user.createdAt
                      ? new Date(user.createdAt).toLocaleDateString('en-UG', { month: 'short', day: 'numeric', year: 'numeric' })
                      : '—'}
                  </td>
                  {tab === 'worker' && (
                    <>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {user.rating != null ? (
                          <span className="flex items-center gap-1 text-slate-700">
                            <Star size={13} className="text-yellow-500 fill-yellow-500" />
                            {user.rating}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">No ratings yet</span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {user.reliabilityScore != null ? (
                          <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                            user.reliabilityScore >= 80 ? 'bg-green-100 text-green-700' :
                            user.reliabilityScore >= 50 ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-600'
                          }`}>
                            {user.reliabilityScore}/100
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">Not enough history</span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="flex items-center gap-1 text-slate-700">
                          <Briefcase size={13} color="#2952E8" />
                          {user.completedJobs ?? 0}
                        </span>
                      </td>
                    </>
                  )}
                  <td className="px-4 py-3">
                    {user.blocked ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-600">
                        <Ban size={11} /> Blocked
                      </span>
                    ) : user.isVerified ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                        <CheckCircle size={11} /> ID verified
                      </span>
                    ) : (
                      <span className="inline-flex text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">
                        Not verified
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {!user.blocked && (
                        <button
                          onClick={() => patchUser(user.id, { isVerified: !user.isVerified })}
                          className="text-xs font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors hover:bg-green-100"
                          style={{ color: user.isVerified ? '#B45309' : '#16A34A' }}
                          title={user.isVerified
                            ? 'Clear the ID-verified badge'
                            : 'Set ID-verified — only after National ID + 2 reference calls are checked'}
                        >
                          <UserCheck size={13} /> {user.isVerified ? 'Unverify' : 'Verify'}
                        </button>
                      )}
                      <button
                        onClick={() => patchUser(user.id, { blocked: !user.blocked })}
                        className="text-xs font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                        style={{ color: user.blocked ? '#2952E8' : '#DC2626' }}>
                        {user.blocked
                          ? <><CheckCircle size={13} /> Unblock</>
                          : <><XCircle size={13} /> Block</>
                        }
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={colCount}>
                    <div className="empty-state">
                      <div className="empty-icon"><Users size={30} color="#2952E8" /></div>
                      <p className="empty-title">No users found</p>
                      <p className="empty-sub">Registered workers and employers will appear here.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
