/* İRİA Bələdçisi — offline support.
   The page is fetched fresh when online and served from the cache when offline.
   Files opened once (PDFs, templates, fonts) are kept so they also open offline. */
const CACHE = 'iria-v1';
const SCOPE = new URL(self.registration.scope);
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll([SCOPE.href, 'manifest.webmanifest', 'icons/icon-192.png'])).catch(() => {}));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
const keep = (key, res) => { if (res && (res.status === 200 || res.type === 'opaque')) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(key, cp)).catch(() => {}); } return res; };
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  const url = new URL(req.url);
  const same = url.origin === SCOPE.origin && url.pathname.indexOf(SCOPE.pathname) === 0;
  const page = same && (url.pathname === SCOPE.pathname || url.pathname === SCOPE.pathname + 'index.html');
  if (page) {                                   // the page: network first, cache when offline
    e.respondWith(fetch(req).then(res => keep(SCOPE.href, res)).catch(() => caches.match(SCOPE.href)));
    return;
  }
  const font = /(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (same || font) {                           // files and fonts: cache first, refreshed in the background
    e.respondWith(caches.match(req).then(hit => {
      const net = fetch(req).then(res => keep(req, res)).catch(() => hit);
      return hit || net;
    }));
  }
});
