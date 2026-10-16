/**
 * TuneFlow Progressive Web App (PWA) Service Worker
 * Strategy: Bypass cache on local desktop engine (127.0.0.1 / localhost) to prevent stale UI lock-in;
 * Network-first with offline fallback for remote mobile/tablet PWA clients.
 */

const CACHE_NAME = 'tuneflow-v2.5.0';
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

  // Always network-only for local desktop engine (127.0.0.1 / localhost) and backend API / streaming
  if (url.hostname === '127.0.0.1' || url.hostname === 'localhost' || url.pathname.startsWith('/api/')) {
    return;
  }

  // Network-first with offline cache fallback for remote PWA clients
  event.respondWith(
    fetch(event.request).then((networkResponse) => {
      if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
      }
      return networkResponse;
    }).catch(() => {
      return caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
      });
    })
  );
});
