// Service Worker v2 - busts all old caches, network-first
const VERSION = 'v2-2026-08-03-00-58';
const CACHE_NAME = `turnitos-${VERSION}`;

self.addEventListener('install', (event) => {
  console.log('[SW-v2] Installing', VERSION);
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW-v2] Activating, clearing ALL old caches');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          console.log('[SW-v2] Deleting cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).then((response) => {
      if (response.status === 200) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, clone).catch(() => {});
        });
      }
      return response;
    }).catch(() => caches.match(event.request))
  );
});

self.__WB_MANIFEST = [];
