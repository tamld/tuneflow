/**
 * TuneFlow Progressive Web App (PWA) Service Worker
 * Strategy: Cache-first for UI shell & static assets; Network-only for /api/ streaming and downloads.
 */

const CACHE_NAME = 'tuneflow-v2.5.0-alpha';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/silver-melody.css',
  '/js/i18n.js',
  '/js/auth.js',
  '/js/admin.js',
  '/js/player.js',
  '/js/app.js',
  '/js/tv-leanback.js',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Always network-first for backend API calls and streaming
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Cache-first for static shell assets with network fallback
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback to offline index page
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
      });
    })
  );
});
