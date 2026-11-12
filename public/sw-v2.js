// Service Worker v2 - busts all old caches, network-first
const VERSION = 'v2-2026-08-03-01-30';
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

const precacheManifest = (self.__WB_MANIFEST || []);
if (precacheManifest.length > 0) {
  console.log('[SW-v2] Precache manifest loaded:', precacheManifest.length);
}

// Web Push: new-booking alerts for the business (sent by the notify-new-booking edge function)
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }

  // Store orders (kind: 'order') only have "Ver pedido"; bookings keep both actions
  const isOrder = data.kind === 'order' || Boolean(data.orderId);
  const title = data.title || (isOrder ? 'Nueva compra en tu tienda' : 'Nueva reserva');
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/logo-turnitos.png',
      badge: '/favicon-48.png',
      tag: data.tag || (isOrder ? `order-${data.orderId}` : data.bookingId ? `booking-${data.bookingId}` : 'turnitos-booking'),
      renotify: true,
      requireInteraction: true,
      vibrate: [200, 100, 200],
      actions: isOrder
        ? [{ action: 'open', title: 'Ver pedido' }]
        : [
          { action: 'open', title: 'Ver reserva' },
          { action: 'agenda', title: 'Abrir agenda' }
        ],
      data: {
        url: data.url || '/portal',
        bookingId: data.bookingId || null,
        orderId: data.orderId || null
      }
    })
  );
});

// Body tap or "Ver reserva"/"Ver pedido" opens that booking or order; "Abrir agenda" opens the calendar
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const { url = '/portal', bookingId = null, orderId = null } = event.notification.data || {};
  const showAgenda = event.action === 'agenda';

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const portal = windows.find((client) => new URL(client.url).pathname.startsWith('/portal'));
    if (portal) {
      await portal.focus();
      portal.postMessage(
        showAgenda ? { type: 'open-agenda' }
          : orderId ? { type: 'open-order', orderId }
            : { type: 'open-booking', bookingId }
      );
      return;
    }
    await self.clients.openWindow(showAgenda ? '/portal' : url);
  })());
});
