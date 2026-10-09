/**
 * RenewX Web Push Service Worker
 * Handles background push notifications and notification click navigation
 * for new product arrivals and store updates.
 */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }

  let data = {};
  try {
    data = event.data.json();
  } catch (err) {
    data = {
      title: 'New Arrival on RenewX',
      body: event.data.text(),
    };
  }

  const title = data.title || 'New Arrival | RenewX';
  const targetUrl = data.url || (data.productId ? `https://renewx.expo.app/product/${data.productId}` : 'https://renewx.expo.app');

  const options = {
    body: data.body || 'A certified device was just added to RenewX.',
    icon: data.icon || '/favicon.png',
    badge: data.badge || '/favicon.png',
    image: data.image || undefined, // Displays large product photo on supported desktop and mobile browsers
    tag: data.tag || (data.productId ? `renewx-product-${data.productId}` : 'renewx-product-arrival'),
    renotify: true,
    requireInteraction: false,
    data: {
      url: targetUrl,
      productId: data.productId,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || 'https://renewx.expo.app';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If an existing RenewX tab is open, focus it and navigate to the product
        for (const client of clientList) {
          if (client.url && 'focus' in client) {
            client.focus();
            if ('navigate' in client && client.url !== targetUrl) {
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
