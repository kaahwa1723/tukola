'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, Job, Role } from './types';
import { MOCK_JOBS } from './data';

// ─── localStorage helpers ────────────────────────────────────────────────────
const safeGet = (key: string): string | null => {
  if (typeof window === 'undefined') return null;
  try { return localStorage.getItem(key); } catch { return null; }
};
const safeSet = (key: string, value: string) => {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(key, value); } catch {}
};
const safeDel = (key: string) => {
  if (typeof window === 'undefined') return;
  try { localStorage.removeItem(key); } catch {}
};

// ─── Fire-and-forget API call ────────────────────────────────────────────────
function api(path: string, options?: RequestInit) {
  fetch(path, { headers: { 'Content-Type': 'application/json' }, ...options })
    .then(async r => {
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        console.warn(`[API ${path}]`, body.error ?? r.statusText);
      }
    })
    .catch(e => console.warn(`[API ${path}]`, e));
}

// ─── Context type ────────────────────────────────────────────────────────────
interface KolaContextType {
  user: User | null;
  jobs: Job[];
  isLoading: boolean;
  applications: string[];
  login: (phone: string, name: string, role: Role) => void;
  logout: () => void;
  postJob: (jobData: Omit<Job, 'id' | 'createdAt' | 'applicants' | 'status'>) => Job;
  applyToJob: (jobId: string) => void;
  completeJob: (jobId: string) => void;
  acceptApplicant: (jobId: string, workerId: string) => void;
  updateUser: (updates: Partial<User>) => void;
  refreshJobs: () => Promise<void>;
}

const KolaContext = createContext<KolaContextType | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────
export function KolaProvider({ children }: { children: ReactNode }) {
  const [user, setUser]               = useState<User | null>(null);
  const [jobs, setJobs]               = useState<Job[]>(MOCK_JOBS);
  const [applications, setApplications] = useState<string[]>([]);
  const [isLoading, setIsLoading]     = useState(true);

  // Fetch jobs from the API and merge with mock data
  const refreshJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/jobs?status=all&limit=100');
      if (!res.ok) return;
      const { jobs: remoteJobs } = await res.json();
      if (remoteJobs?.length) {
        setJobs(prev => {
          const remoteIds = new Set(remoteJobs.map((j: Job) => j.id));
          return [...remoteJobs, ...prev.filter((j: Job) => !remoteIds.has(j.id))];
        });
      }
    } catch (e) {
      console.warn('[refreshJobs]', e);
    }
  }, []);

  useEffect(() => {
    // Restore cached user + applications
    const storedUser = safeGet('kola_user');
    const storedApps = safeGet('kola_applications');

    if (storedUser) {
      try { setUser(JSON.parse(storedUser)); } catch {}
    }
    if (storedApps) {
      try { setApplications(JSON.parse(storedApps)); } catch {}
    }

    // Load live jobs from API
    refreshJobs().finally(() => setIsLoading(false));
  }, [refreshJobs]);

  // ── login ──────────────────────────────────────────────────────────────────
  const login = useCallback((phone: string, name: string, role: Role) => {
    // Optimistic: set user immediately
    const optimisticUser: User = {
      id: `user_${Date.now()}`,
      name, phone, role,
      location: 'Kampala, Uganda',
      rating: 4.5, completedJobs: 0,
      skills: [], about: '',
      responseTime: '< 30 mins',
      lastActive: 'Just now',
      isVerified: false,
      portfolioImages: [],
    };
    setUser(optimisticUser);
    safeSet('kola_user', JSON.stringify(optimisticUser));

    // Persist to backend; on success, update the stored ID with the server's canonical ID
    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, name, role }),
    })
      .then(r => r.json())
      .then(({ user: serverUser }) => {
        if (serverUser) {
          setUser(serverUser);
          safeSet('kola_user', JSON.stringify(serverUser));
        }
      })
      .catch(e => console.warn('[login API]', e));
  }, []);

  // ── logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    setUser(null);
    setApplications([]);
    safeDel('kola_user');
    safeDel('kola_applications');
    safeDel('kola_user_jobs');
    safeDel('kola_onboarded');
  }, []);

  // ── postJob ────────────────────────────────────────────────────────────────
  const postJob = useCallback(
    (jobData: Omit<Job, 'id' | 'createdAt' | 'applicants' | 'status'>): Job => {
      const newJob: Job = {
        ...jobData,
        id: `job_${Date.now()}`,
        createdAt: new Date().toISOString(),
        applicants: [],
        status: 'open',
      };
      setJobs(prev => [newJob, ...prev]);

      // Persist to backend
      fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jobData),
      })
        .then(r => r.json())
        .then(({ job: serverJob }) => {
          if (serverJob) {
            // Replace the optimistic job with the server version (real ID)
            setJobs(prev => prev.map(j => j.id === newJob.id ? serverJob : j));
          }
        })
        .catch(e => console.warn('[postJob API]', e));

      return newJob;
    },
    []
  );

  // ── applyToJob ─────────────────────────────────────────────────────────────
  const applyToJob = useCallback(
    (jobId: string) => {
      if (!user) return;
      const updatedApps = [...applications, jobId];
      setApplications(updatedApps);
      safeSet('kola_applications', JSON.stringify(updatedApps));

      const appliedAt = new Date().toISOString();
      setJobs(prev =>
        prev.map(j => {
          if (j.id === jobId && !j.applicants.find(a => a.workerId === user.id)) {
            return {
              ...j,
              applicants: [
                ...j.applicants,
                {
                  workerId: user.id, workerName: user.name,
                  rating: user.rating ?? 4.5, completedJobs: user.completedJobs ?? 0,
                  skills: user.skills ?? [], appliedAt, status: 'pending' as const,
                },
              ],
            };
          }
          return j;
        })
      );

      api(`/api/jobs/${jobId}/apply`, {
        method: 'POST',
        body: JSON.stringify({
          workerId: user.id, workerName: user.name,
          rating: user.rating, completedJobs: user.completedJobs,
          skills: user.skills,
        }),
      });
    },
    [user, applications]
  );

  // ── acceptApplicant ────────────────────────────────────────────────────────
  const acceptApplicant = useCallback((jobId: string, workerId: string) => {
    setJobs(prev =>
      prev.map(j => {
        if (j.id !== jobId) return j;
        return {
          ...j, status: 'in_progress' as const,
          applicants: j.applicants.map(a =>
            a.workerId === workerId ? { ...a, status: 'accepted' as const } : a
          ),
        };
      })
    );
    api(`/api/jobs/${jobId}/accept`, { method: 'POST', body: JSON.stringify({ workerId }) });
  }, []);

  // ── completeJob ────────────────────────────────────────────────────────────
  const completeJob = useCallback((jobId: string) => {
    const completedAt = new Date().toISOString();
    setJobs(prev =>
      prev.map(j => j.id === jobId ? { ...j, status: 'completed' as const, completedAt } : j)
    );
    api(`/api/jobs/${jobId}/complete`, { method: 'POST' });
  }, []);

  // ── updateUser ─────────────────────────────────────────────────────────────
  const updateUser = useCallback((updates: Partial<User>) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      safeSet('kola_user', JSON.stringify(updated));

      // Persist to backend
      api(`/api/users/${prev.id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      return updated;
    });
  }, []);

  return (
    <KolaContext.Provider
      value={{
        user, jobs, isLoading, applications,
        login, logout, postJob, applyToJob, completeJob, acceptApplicant, updateUser,
        refreshJobs,
      }}
    >
      {children}
    </KolaContext.Provider>
  );
}

export function useKola() {
  const ctx = useContext(KolaContext);
  if (!ctx) throw new Error('useKola must be used within KolaProvider');
  return ctx;
}
