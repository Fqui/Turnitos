// Custom SW: limpia caches viejos y fuerza actualización
const VERSION = 'v2-2026-07-12-22-05';
const CACHE_NAME = `turnitos-${VERSION}`;

self.addEventListener('install', (event) => {
  console.log('[SW-custom] Installing version', VERSION);
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW-custom] Activating version', VERSION, '- clearing ALL old caches');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW-custom] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
          return null;
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Network-first strategy: siempre fetch del network, cachea fallback
  event.respondWith(
    fetch(event.request).then((response) => {
      // Solo cachear GETs exitosos
      if (event.request.method === 'GET' && response.status === 200) {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone).catch(() => {});
        });
      }
      return response;
    }).catch(() => {
      // Fallback al cache si network falla
      return caches.match(event.request);
    })
  );
});

self.__WB_MANIFEST = [];
