/* Service Worker für „Wer ist weg?“
   Cache-first mit Aktualisierung im Hintergrund: Die App startet sofort auch offline,
   neue Versionen von GitHub Pages sind beim nächsten Start da.
   Bei Änderungen an den Dateien VERSION hochzählen. */
const VERSION = 'v1';
const CACHE = 'wer-ist-weg-' + VERSION;
const ASSETS = [
  './',
  './index.html',
  './wer-ist-weg.html',
  './manifest.webmanifest',
  './icon.svg',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => Promise.allSettled(ASSETS.map(url => cache.add(new Request(url, { cache: 'reload' })))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('wer-ist-weg-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Fremde Server (z. B. die optionale Texterkennung) nicht anfassen
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req, { ignoreSearch: true });
    const network = fetch(req).then(res => {
      if (res && res.ok && res.type === 'basic') cache.put(req, res.clone());
      return res;
    }).catch(() => null);

    if (cached) {
      event.waitUntil(network);
      return cached;
    }
    const res = await network;
    if (res) return res;
    if (req.mode === 'navigate') {
      const app = await cache.match('./wer-ist-weg.html');
      if (app) return app;
    }
    return new Response('Offline und nicht im Cache.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  })());
});
