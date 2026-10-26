/* Service worker for Mahdi Translate (v5 — focused instant translator).
 * Strategy:
 *  - app shell / static assets: cache-first with background revalidation, so
 *    the whole app (including the bundled offline dictionary) works offline
 *  - /api/*: never cached
 *  - Tesseract OCR assets (worker/wasm/traineddata on CDNs): network first
 *    with cache fallback, so image OCR keeps working offline after first use
 *  - other cross-origin (fonts, Tailwind CDN): network first, cache fallback
 */
const CACHE = 'mahdi-translate-v5-1-1';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icons/icon.svg'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then(cache => cache.addAll(SHELL).catch(() => undefined))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const isApi = url.pathname.startsWith('/api/');
  const isSameOrigin = url.origin === self.location.origin;

  // Never cache the translation API.
  if (isApi) return;

  if (isSameOrigin) {
    event.respondWith(
      caches.match(req).then(cached => {
        const network = fetch(req)
          .then(res => {
            if (res && res.status === 200 && (res.type === 'basic' || res.type === 'cors')) {
              const copy = res.clone();
              caches.open(CACHE).then(cache => cache.put(req, copy));
            }
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // Cross-origin (fonts, Tailwind CDN): network first, cache fallback.
  event.respondWith(
    fetch(req)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(cache => cache.put(req, copy)).catch(() => undefined);
        return res;
      })
      .catch(() => caches.match(req))
  );
});
