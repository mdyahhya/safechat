// SafeChat Service Worker v1.0.0
const CACHE_VERSION = 'safechat-v1.0.0';
const CACHE_NAME = `safechat-cache-${CACHE_VERSION}`;
const GITHUB_REPO = 'mdyahhya/safechat';

const STATIC_ASSETS = [
  '/styles.css',
  
  '/manifest.json',
  '/chaticon48.png',
'/chaticon72.png',
'/chaticon192.png',
'/chaticon256.png',
'/chaticon512.png'

];

// Install event
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('[SW] Some assets failed to cache:', err);
      });
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.pathname === '/' || url.pathname === '/index.html') {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then(response => response)
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  if (STATIC_ASSETS.includes(url.pathname) || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          fetch(request).then((networkResponse) => {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, networkResponse);
            });
          }).catch(() => {});
          return cachedResponse;
        }
        return fetch(request).then((response) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, response.clone());
            return response;
          });
        });
      })
    );
    return;
  }

  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// ✅ HELPER FUNCTION: Show multiple notifications sequentially with intense vibration
async function showMultipleNotifications(title, body, count = 5, delayMs = 1000) {
  let data = {};
  
  for (let i = 0; i < count; i++) {
    console.log(`[SW] Showing notification ${i + 1} of ${count}`);
    
    await self.registration.showNotification(title, {
      body: `${body} (${i + 1}/${count})`,
      icon: '/chaticon.png',
      badge: '/chaticon.png',
      // More intense vibration: faster pulses (500ms vibrate + 100ms pause pattern repeated)
      vibrate: [500, 100, 500, 100, 500, 100, 500, 100, 500],
      tag: `safechat-message-${i}`,
      data: data,
      requireInteraction: false
    });

    // Wait before showing next notification (1 second delay)
    if (i < count - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}

// ✅ UPDATED PUSH EVENT HANDLER
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received:', event);
  
  let data = {};
  
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    console.error('[SW] Error parsing push data:', e);
  }
  
  const title = data.title || 'SafeChat';
  const body = data.body || 'You have a new message in SafeChat';

  // Show 5 notifications one after another with 1 second gap between them
  // Each notification vibrates with intense pattern for ~3 seconds
  event.waitUntil(
    showMultipleNotifications(title, body, 5, 1000)
  );
});

// ✅ KEEP ONLY THIS Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (let client of clientList) {
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// Background sync
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  }
});

async function syncMessages() {
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({ type: 'SYNC_MESSAGES' });
  });
}

// Periodic sync for scheduled notifications
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-scheduled-notifications') {
    event.waitUntil(checkScheduledNotifications());
  }
});

async function checkScheduledNotifications() {
  const now = new Date();
  const hour = now.getHours();
  
  if (hour === 9) {
    await self.registration.showNotification('SafeChat', {
      body: 'Good morning! Check your messages 👋',
      icon: '/chaticon1.png',
      badge: '/chaticon1.png',
      tag: 'morning-reminder'
    });
  }
  
  if (hour === 18) {
    await self.registration.showNotification('SafeChat', {
      body: 'Good evening! You might have new messages 🌙',
      icon: '/chaticon1.png',
      badge: '/chaticon1.png',
      tag: 'evening-reminder'
    });
  }
}

// Message handler
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      }).then(() => {
        event.ports[0].postMessage({ success: true });
      })
    );
  }
});
