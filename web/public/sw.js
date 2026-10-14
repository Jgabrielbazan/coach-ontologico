// Service worker mínimo: permite instalar la app y abrirla aunque la red falle
// un momento. Nunca guarda en caché las llamadas a /api.
const CACHE = 'coach-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys().then((claves) => Promise.all(claves.filter((c) => c !== CACHE).map((c) => caches.delete(c)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (evento) => {
  const url = new URL(evento.request.url);
  if (evento.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api')) return;

  // Primero la red (siempre la versión más nueva); si no hay, lo guardado.
  evento.respondWith(
    fetch(evento.request)
      .then((respuesta) => {
        const copia = respuesta.clone();
        caches.open(CACHE).then((cache) => cache.put(evento.request, copia));
        return respuesta;
      })
      .catch(() => caches.match(evento.request).then((r) => r ?? caches.match('/'))),
  );
});
