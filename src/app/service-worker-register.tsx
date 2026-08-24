'use client';

import { useEffect } from 'react';

/**
 * Registers the offline service worker. Skipped in development so hot
 * reload is never served from cache; enabled in production builds (PWA).
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* offline support is best-effort */
    });
  }, []);

  return null;
}