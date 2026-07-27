'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, Job, Role } from './types';
import { MOCK_JOBS } from './data';

// ─── Demo mode ───────────────────────────────────────────────────────────────
// When true, mock jobs/workers are shown (for demos). When false/omitted,
// jobs come only from the DB/API — nothing mock enters the jobs list.
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
const MOCK_JOB_IDS = new Set(MOCK_JOBS.map(j => j.id));

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
  /** Adopt a server-issued user (after OTP verify or register). */
  setSessionUser: (user: User) => void;
  /** New-user signup after OTP verify — calls /api/auth/register. */
  register: (phone: string, name: string, role: Role) => Promise<User | null>;
  logout: () => void;
  postJob: (jobData: Omit<Job, 'id' | 'createdAt' | 'applicants' | 'status' | 'employerId' | 'employerName' | 'employerPhone'>) => Job;
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
  const [jobs, setJobs]               = useState<Job[]>(DEMO_MODE ? MOCK_JOBS : []);
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
          return [...remoteJobs, ...prev.filter((j: Job) => !remoteIds.has(j.id) && (DEMO_MODE || !MOCK_JOB_IDS.has(j.id)))];
        });
      }
    } catch (e) {
      console.warn('[refreshJobs]', e);
    }
  }, []);

  useEffect(() => {
    // Identity comes from the SERVER SESSION — never from localStorage.
    // /api/auth/me resolves the HttpOnly session cookie to a real profile.
    const storedApps = safeGet('kola_applications');
    if (storedApps) {
      try { setApplications(JSON.parse(storedApps)); } catch {}
    }

    fetch('/api/auth/me')
      .then(r => (r.ok ? r.json() : null))
      .then(data => { if (data?.user) setUser(data.user); })
      .catch(() => {})
      .finally(() => {
        // Load live jobs from API
        refreshJobs().finally(() => setIsLoading(false));
      });
  }, [refreshJobs]);

  // ── setSessionUser ─────────────────────────────────────────────────────────
  // Called by /verify (returning users) and /role (new users) after the
  // server has issued a session — the client never invents identity.
  const setSessionUser = useCallback((serverUser: User) => {
    setUser(serverUser);
    safeSet('kola_onboarded', 'true');
  }, []);

  // ── register ───────────────────────────────────────────────────────────────
  // New-user signup. The server independently requires proof that the phone
  // was OTP-verified moments ago; it returns the canonical profile.
  const register = useCallback(async (phone: string, name: string, role: Role): Promise<User | null> => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, name, role }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.user) {
        console.warn('[register]', data?.error ?? res.statusText);
        return null;
      }
      setSessionUser(data.user);
      return data.user as User;
    } catch (e) {
      console.warn('[register]', e);
      return null;
    }
  }, [setSessionUser]);

  // ── logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    setUser(null);
    setApplications([]);
    safeDel('kola_applications');
    safeDel('kola_onboarded');
    // Tell the server to clear the session cookie
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
  }, []);

  // ── postJob ────────────────────────────────────────────────────────────────
  const postJob = useCallback(
    (jobData: Omit<Job, 'id' | 'createdAt' | 'applicants' | 'status' | 'employerId' | 'employerName' | 'employerPhone'>): Job => {
      const newJob: Job = {
        ...jobData,
        id: `job_${Date.now()}`,
        createdAt: new Date().toISOString(),
        applicants: [],
        status: 'open',
        // Employer identity is filled by the server from the session;
        // shown optimistically from the current user
        employerId: user?.id ?? '',
        employerName: user?.name ?? '',
        employerPhone: user?.phone,
      };
      setJobs(prev => [newJob, ...prev]);

      // Persist to backend (server derives employer from session)
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
    [user]
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
        body: JSON.stringify({}),
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
    const job = jobs.find(j => j.id === jobId);
    // Only the owning employer may complete a job via the API
    if (user?.role === 'employer' && job?.employerId === user.id) {
      api(`/api/jobs/${jobId}/complete`, { method: 'POST', body: JSON.stringify({}) });
    }
  }, [user, jobs]);

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
        setSessionUser, register, logout, postJob, applyToJob, completeJob, acceptApplicant, updateUser,
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
