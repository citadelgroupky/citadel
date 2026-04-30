const CACHE_NAME = 'citadel-v3';
const ASSETS = [
  '/citadel/',
  '/citadel/index.html',
  'https://fonts.googleapis.com/css2?family=Barlow:wght@300;400;500;600&family=Barlow+Condensed:wght@300;400;500;600;700&display=swap'
];

// Install — cache core assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

// Activate — clean up old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — network first, fall back to cache
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.hostname.includes('supabase.co')) {
    e.respondWith(
      fetch(e.request).catch(() => new Response(JSON.stringify([]), {
        headers: { 'Content-Type': 'application/json' }
      }))
    );
    return;
  }
  if (url.hostname.includes('fonts.')) {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        return res;
      }))
    );
    return;
  }
  e.respondWith(
    fetch(e.request).then(res => {
      const clone = res.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
      return res;
    }).catch(() => caches.match(e.request))
  );
});

// ── PERSISTENT CLOCK-IN NOTIFICATION ──
const CLOCK_IN_TAG = 'citadel-clocked-in';

self.addEventListener('message', e => {
  if (e.data?.type === 'CLOCK_IN') {
    self.registration.showNotification('Citadel — Clocked In', {
      body: `You are clocked in at ${e.data.location}. Tap to open the app.`,
      icon: '/citadel/icon-192.png',
      tag: CLOCK_IN_TAG,
      renotify: false,
      silent: true,
      requireInteraction: true  // stays until dismissed on Android
    });
  }
  if (e.data?.type === 'CLOCK_OUT') {
    self.registration.getNotifications({ tag: CLOCK_IN_TAG })
      .then(notifications => notifications.forEach(n => n.close()));
  }
});

// Tap notification — open app
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then(list => {
      if (list.length) return list[0].focus();
      return clients.openWindow('/citadel/');
    })
  );
});
