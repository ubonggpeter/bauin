// BAUIN Service Worker
const CACHE_VER    = 'bauin-v1';
const STATIC_URLS  = [
  '/offline.html',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/badge-72.png',
  '/manifest.json',
];

// ── Install: pre-cache shell ─────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VER)
      .then((cache) => cache.addAll(STATIC_URLS))
      .then(() => self.skipWaiting()),
  );
});

// ── Activate: evict old caches ───────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_VER).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

// ── Fetch strategy ───────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only intercept same-origin GET requests
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // API routes: network-only (no caching)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ error: 'offline' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );
    return;
  }

  // Navigation requests: network-first with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            caches.open(CACHE_VER).then((c) => c.put(request, res.clone()));
          }
          return res;
        })
        .catch(() =>
          caches.match(request)
            .then((cached) => cached || caches.match('/offline.html')),
        ),
    );
    return;
  }

  // Static assets: cache-first, fill on miss
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((res) => {
        if (res.ok && !url.pathname.startsWith('/_next/static/chunks/')) {
          caches.open(CACHE_VER).then((c) => c.put(request, res.clone()));
        }
        return res;
      });
    }),
  );
});

// ── Push notifications ───────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch {}

  const {
    title   = 'BAUIN',
    body    = '',
    icon    = '/icons/icon-192.png',
    badge   = '/icons/badge-72.png',
    tag     = 'bauin-push',
    url     = '/dashboard',
    actions = [],
  } = data;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      tag,
      data:    { url },
      actions,
      vibrate: [150, 75, 150],
      requireInteraction: false,
    }),
  );
});

// ── Notification click: focus or open ────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url ?? '/dashboard';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windows) => {
        const existing = windows.find((w) => w.url.includes(target) && 'focus' in w);
        if (existing) return existing.focus();
        return self.clients.openWindow(target);
      }),
  );
});
