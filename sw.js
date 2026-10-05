// ==============================================================================
// PROVISION — Service Worker (Offline & Smart Cache)
// Cache-First for static UI assets, Network-First for data.js
// ==============================================================================

const CACHE_NAME = 'provision-app-v2';

const SHELL_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './favicon.svg',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

// 1. Install: Pre-cache shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(SHELL_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate: Clear old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch: Smart strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Strategy A: data.js -> Network-First with Cache Fallback
  // Ensures updates from Cronicle / GitHub Pages are always pulled when online,
  // but falls back to cached recipes when offline.
  if (url.pathname.endsWith('data.js')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const resClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Strategy B: External Images (Unsplash) -> Cache-First
  if (url.hostname.includes('images.unsplash.com')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const resClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
          }
          return networkResponse;
        }).catch(() => {
          // If offline and image not cached, return empty or transparent
          return new Response('', { status: 408, headers: { 'Content-Type': 'text/plain' } });
        });
      })
    );
    return;
  }

  // Strategy C: App Shell (HTML, CSS, JS) -> Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const resClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
