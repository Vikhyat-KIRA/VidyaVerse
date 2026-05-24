// VidyaVerse PWA Background Service Worker
// Enables notifications even when the browser or tab is completely closed.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Listen for background push events from push service providers
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push event received.');

  let payload = {
    title: 'VidyaVerse 🔥',
    body: 'You received a new notification!',
    url: '/'
  };

  if (event.data) {
    try {
      payload = event.data.json();
    } catch (e) {
      payload = {
        title: 'VidyaVerse 🔥',
        body: event.data.text(),
        url: '/'
      };
    }
  }

  const options = {
    body: payload.body,
    icon: '/logo.png', // Premium logo brand icon
    badge: '/icon.png',
    vibrate: [100, 50, 100],
    data: {
      url: payload.url || '/'
    },
    actions: [
      { action: 'open', title: 'Open VidyaVerse' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  );
});

// Handle clicking on the background notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  // Find existing client window and focus it, or open a new one
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If there's an existing open tab of VidyaVerse, focus it and redirect
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({ type: 'navigate', url: targetUrl });
          return client.focus();
        }
      }
      // Otherwise, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
