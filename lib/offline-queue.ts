'use client';

/**
 * Offline outbox — queues job posts and job applications while the
 * network is down and replays them when connectivity returns.
 *
 * Why localStorage and not IndexedDB: the queue holds a handful of small
 * JSON items; localStorage is synchronous, works on every low-end Android
 * WebView our users carry, and needs no schema versioning. If the queue
 * ever grows (chat, images), move to IndexedDB behind this same API.
 *
 * Dedupe discipline:
 *   - Every submission gets a client-generated `clientRequestId`
 *     (crypto.randomUUID) at the moment the user taps submit. Retries —
 *     automatic or manual — reuse the SAME id.
 *   - The server stores it on the row (jobs.idempotency_key, migration
 *     010) and returns the existing row on replay, so a flushed queue
 *     can never double-post a job. Applications are naturally idempotent
 *     via UNIQUE(job_id, worker_id).
 *
 * Replay triggers: the `online` event, plus an attempt on app start.
 * Items are dropped after MAX_ATTEMPTS server rejections so a poisoned
 * item can't loop forever (4xx responses are dropped immediately —
 * retrying a validation error will never succeed).
 */

const STORAGE_KEY = 'kola_offline_queue';
const MAX_ATTEMPTS = 8;

export type QueuedSubmission = {
  /** Idempotency key — sent to the API as clientRequestId. */
  id: string;
  kind: 'job_post' | 'job_apply';
  /** job_post: the Job form fields. job_apply: { jobId }. */
  payload: Record<string, unknown>;
  createdAt: string;
  attempts: number;
};

/** Client-generated idempotency key, reused across every retry. */
export function newClientRequestId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  // Older WebViews: randomUUID missing — good enough for dedupe
  return `crq_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function read(): QueuedSubmission[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as QueuedSubmission[]) : [];
  } catch {
    return [];
  }
}

function write(items: QueuedSubmission[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Storage full / private mode — the submission is lost, but the user
    // already saw the optimistic UI; log so support can correlate.
    console.warn('[offline-queue] could not persist queue');
  }
  window.dispatchEvent(new CustomEvent('kola:queue-change', { detail: { pending: items.length } }));
}

export function enqueue(item: Omit<QueuedSubmission, 'createdAt' | 'attempts'>): void {
  const items = read();
  if (items.some(i => i.id === item.id)) return; // never queue twice
  items.push({ ...item, createdAt: new Date().toISOString(), attempts: 0 });
  write(items);
}

export function pendingCount(): number {
  return read().length;
}

function endpointFor(item: QueuedSubmission): { url: string; body: Record<string, unknown> } {
  if (item.kind === 'job_apply') {
    return {
      url: `/api/jobs/${item.payload.jobId}/apply`,
      body: { clientRequestId: item.id },
    };
  }
  return {
    url: '/api/jobs',
    body: { ...item.payload, clientRequestId: item.id },
  };
}

let flushing = false;

/**
 * Replay queued submissions in order. Returns counts for logging/UI.
 * Safe to call concurrently — a flush already in progress is a no-op.
 */
export async function flushQueue(): Promise<{ sent: number; kept: number; dropped: number }> {
  if (flushing || typeof window === 'undefined') return { sent: 0, kept: 0, dropped: 0 };
  if (!navigator.onLine) return { sent: 0, kept: read().length, dropped: 0 };

  flushing = true;
  let sent = 0, dropped = 0;

  try {
    const items = read();
    const remaining: QueuedSubmission[] = [];

    for (const item of items) {
      const { url, body } = endpointFor(item);
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          sent++;
          continue;
        }
        if (res.status >= 400 && res.status < 500) {
          // Server rejected it (validation, job closed, already applied):
          // retrying won't help — drop, but keep it visible in logs.
          console.warn(`[offline-queue] dropping ${item.kind} ${item.id}: HTTP ${res.status}`);
          dropped++;
          continue;
        }
        // 5xx — transient, keep for next flush
        item.attempts++;
        if (item.attempts >= MAX_ATTEMPTS) {
          console.warn(`[offline-queue] dropping ${item.kind} ${item.id}: too many attempts`);
          dropped++;
        } else {
          remaining.push(item);
        }
      } catch {
        // Still offline / network flapped mid-flush — keep everything
        // not yet processed and stop.
        item.attempts++;
        remaining.push(item, ...items.slice(items.indexOf(item) + 1));
        break;
      }
    }

    write(remaining);
    return { sent, kept: remaining.length, dropped };
  } finally {
    flushing = false;
  }
}

let wired = false;

/**
 * Wire the replay triggers (online event + an initial attempt on app
 * start). Idempotent — safe to call from a client component effect.
 */
export function startOfflineQueueSync(): void {
  if (wired || typeof window === 'undefined') return;
  wired = true;
  window.addEventListener('online', () => { flushQueue(); });
  // Initial pass: connectivity may already be back when the app opens
  flushQueue();
}
