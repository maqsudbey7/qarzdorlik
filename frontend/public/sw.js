/* Qarzingniber — service worker.
 * - Ilova qobig'i (HTML, JS, CSS, ikonkalar) keshlanadi → tez ochiladi, internet bo'lmasa ham ochiladi.
 * - Ma'lumotlar (GET /api/...) avval internetdan, bo'lmasa oxirgi saqlangan nusxadan.
 * - Rasmlar o'zgarmaydi → bir marta yuklanadi va keshdan beriladi.
 * - Kirish/chiqish so'rovlari va o'zgartirishlar (POST/PUT/DELETE) hech qachon keshlanmaydi.
 */
const SHELL = 'qarz-shell-v2';
const API = 'qarz-api-v1';
const PHOTOS = 'qarz-photos-v1';
const KEEP = [SHELL, API, PHOTOS];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(['/', '/manifest.webmanifest', '/icons/icon-192.png', '/favicon.svg'])));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => !KEEP.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Chiqishda sahifa "clear" deb xabar yuboradi — boshqa foydalanuvchi ma'lumotlari qolmasin
self.addEventListener('message', (e) => {
  if (e.data === 'clear-user-data') e.waitUntil(Promise.all([caches.delete(API), caches.delete(PHOTOS)]));
});

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(req);
    if (hit) return hit;
    throw err;
  }
}

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/api/')) {
    if (url.pathname.startsWith('/api/auth') || url.pathname.startsWith('/api/docs') || url.pathname.startsWith('/api/openapi')) return;
    if (/^\/api\/(photos\/\d+|public\/[^/]+\/photos\/\d+)$/.test(url.pathname)) { e.respondWith(cacheFirst(req, PHOTOS)); return; }
    e.respondWith(networkFirst(req, API));
    return;
  }

  // Sahifalar: avval internet (yangi versiya), bo'lmasa saqlangan qobiq
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(SHELL).then((c) => c.put('/', copy));
      return res;
    }).catch(async () => (await caches.match('/')) || Response.error()));
    return;
  }

  // Hash'li fayllar (assets/*), ikonkalar, shriftlar — keshdan
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/') || url.pathname.startsWith('/screenshots/')) {
    e.respondWith(cacheFirst(req, SHELL));
  }
});
