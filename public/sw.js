/**
 * RenewX Progressive Web App (PWA) Service Worker
 * Version: 2.1.0
 * Features:
 * - App shell & static asset offline caching
 * - Network-first navigation with offline fallback
 * - Background Web Push notifications (promotions, product arrivals, orders)
 * - Safe notification click navigation & deep-linking
 */

const CACHE_NAME = 'renewx-pwa-v2.1.0';

// Core assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
];

// 1. INSTALL LIFECYCLE
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log('[PWA ServiceWorker] Pre-caching app shell assets');
        return cache.addAll(PRECACHE_ASSETS).catch((err) => {
          console.warn('[PWA ServiceWorker] Pre-cache partial notice:', err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// 2. ACTIVATE LIFECYCLE: Purge stale caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.map((name) => {
            if (name !== CACHE_NAME && name.startsWith('renewx-pwa-')) {
              console.log('[PWA ServiceWorker] Removing old cache version:', name);
              return caches.delete(name);
            }
            return Promise.resolve(false);
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

// 3. FETCH INTERCEPTION: Offline App Shell & Stale-While-Revalidate
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Bypass non-GET requests (mutations, checkouts, POSTs)
  if (req.method !== 'GET') {
    return;
  }

  // Bypass API calls from caching to ensure fresh financial/inventory data
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // A. Navigation requests (HTML pages): Network-first with cached App Shell fallback
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const resClone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return networkRes;
        })
        .catch(async () => {
          console.log('[PWA ServiceWorker] Serving cached app shell for:', req.url);
          const cached = await caches.match(req);
          if (cached) return cached;
          return (await caches.match('/')) || (await caches.match('/index.html'));
        })
    );
    return;
  }

  // B. Static assets (images, fonts, scripts, css): Stale-while-revalidate
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|webp|woff2?|ico)$/) ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')
  ) {
    event.respondWith(
      caches.match(req).then((cachedRes) => {
        const fetchPromise = fetch(req)
          .then((networkRes) => {
            if (networkRes && networkRes.status === 200) {
              const resClone = networkRes.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
            }
            return networkRes;
          })
          .catch(() => cachedRes);

        return cachedRes || fetchPromise;
      })
    );
    return;
  }

  // Default: direct fetch
});

// 4. WEB PUSH NOTIFICATIONS
self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }

  let data = {};
  try {
    data = event.data.json();
  } catch (err) {
    data = {
      title: 'RenewX Store Update',
      body: event.data.text(),
    };
  }

  const title = data.title || 'RenewX Marketplace';
  const targetUrl = data.url || (data.productId ? `/product/${data.productId}` : '/');

  const options = {
    body: data.body || 'New update available on RenewX.',
    icon: data.icon || '/icons/icon-192.png',
    badge: data.badge || '/favicon.png',
    image: data.image || undefined,
    tag: data.tag || (data.productId ? `renewx-product-${data.productId}` : 'renewx-alert'),
    vibrate: [100, 50, 100],
    renotify: true,
    requireInteraction: data.requireInteraction ?? false,
    data: {
      url: targetUrl,
      productId: data.productId,
      type: data.type || 'SYSTEM',
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// 5. NOTIFICATION CLICK & FOCUS
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If an existing RenewX tab is open, focus it and navigate
        for (const client of clientList) {
          if (client.url && 'focus' in client) {
            client.focus();
            if ('navigate' in client) {
              client.navigate(targetUrl);
            }
            return;
          }
        }
        // Otherwise open a new browser window/tab
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
