/* Offline-first service worker: cache app shell + bundled template, serve
   from cache when the network is unavailable. */
const CACHE_NAME = 'member-eval-v5';
const PRECACHE = [
  '/',
  '/exel need/SMMEMBER .xlsx',
  '/icon.svg',
  '/manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) return;

  // Never cache the Excel template at runtime — it has cache-busting params
  // and must always come from the network so formula updates take effect.
  if (request.url.includes('/exel need/') && request.url.endsWith('.xlsx')) {
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const network = await fetch(request);
        if (network.ok) cache.put(request, network.clone());
        return network;
      } catch {
        const cached = await cache.match(request);
        if (cached) return cached;
        if (request.mode === 'navigate') {
          const shell = await cache.match('/');
          if (shell) return shell;
        }
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      }
    })(),
  );
});
