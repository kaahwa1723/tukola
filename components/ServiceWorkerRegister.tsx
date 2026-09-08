'use client';

import { useEffect } from 'react';
import { startOfflineQueueSync } from '@/lib/offline-queue';

/**
 * Registers /sw.js (app-shell caching) and starts the offline outbox
 * replay loop. Rendered once from the root layout; invisible.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .catch((e) => console.warn('[sw] registration failed', e));
    }
    startOfflineQueueSync();
  }, []);

  return null;
}
