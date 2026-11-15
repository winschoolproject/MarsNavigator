/* Mars Navigator offline helper (service worker).
   Keeps a copy of the website and every map tile you have already looked at, so the app keeps working
   with no internet connection: at a base on Mars it would run from the habitat's own server.
   Code drafted with help from an SI assistant (Claude) and reviewed by the team. */
const CORE = 'marsnav-core-v15', TILES = 'marsnav-tiles-v1';
const FILES = ['./', 'index.html', 'globe.html', 'guide.html', 'present.html', 'data.js', 'crew.js',
  'lib/leaflet/leaflet.js', 'lib/leaflet/leaflet.css', 'lib/three/three.module.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CORE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CORE && k !== TILES).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (u.hostname === 'trek.nasa.gov') {            // map tiles: use the saved copy first, fetch and save if missing
    e.respondWith(caches.open(TILES).then(c => c.match(e.request).then(hit => hit || fetch(e.request).then(r => { if (r.ok || r.type === 'opaque') c.put(e.request, r.clone()); return r; }))));
    return;
  }
  if (u.origin === location.origin) {               // the website itself: try the network, fall back to the saved copy
    e.respondWith(fetch(e.request).then(r => { if (r.ok) { const cp = r.clone(); caches.open(CORE).then(c => c.put(e.request, cp)); } return r; }).catch(() => caches.match(e.request)));
  }
});
