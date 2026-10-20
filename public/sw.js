/**
 * Service Worker de Resiliencia Offline para ClimasFlood Chile.
 * Estrategia Network-First con respaldo automático en Caché:
 * - Durante una emergencia o corte de señal móvil en un temporal, entrega la interfaz
 *   y la última respuesta válida de las APIs abiertas almacenada en caché.
 */

const CACHE_NAME = 'climasflood-chile-v2';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/styles.css',
  '/js/app.js',
  '/js/data/chile-data.js',
  '/js/modules/live-api.js',
  '/js/modules/map-engine.js',
  '/js/modules/satellite-viewer.js',
  '/js/modules/charts.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone).catch(() => {});
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        return new Response(JSON.stringify({ ok: false, offline: true }), {
          status: 503,
          headers: { 'Content-Type': 'application/json; charset=utf-8' }
        });
      })
  );
});
