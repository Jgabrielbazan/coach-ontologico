// Service worker mínimo: permite instalar la app y abrirla aunque la red falle
// un momento. Nunca intercepta las rutas internas de Firebase (/__/).
const CACHE = 'coach-v4';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys().then((claves) => Promise.all(claves.filter((c) => c !== CACHE).map((c) => caches.delete(c)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (evento) => {
  const url = new URL(evento.request.url);
  if (evento.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/__/')) return;

  // Primero la red (siempre la versión más nueva); si no hay, lo guardado.
  evento.respondWith(
    fetch(evento.request, { cache: 'no-cache' })
      .then((respuesta) => {
        const copia = respuesta.clone();
        caches.open(CACHE).then((cache) => cache.put(evento.request, copia));
        return respuesta;
      })
      .catch(() => caches.match(evento.request).then((r) => r ?? caches.match('/'))),
  );
});

// Recordatorios: muestra la notificación que manda el servidor.
self.addEventListener('push', (evento) => {
  let datos = {};
  try {
    datos = evento.data?.json() ?? {};
  } catch {}
  evento.waitUntil(
    self.registration.showNotification(datos.titulo || 'Coach Ontológico', {
      body: datos.cuerpo || 'Unos minutos hoy para tu práctica.',
      icon: '/icono-192.png',
      badge: '/icono-192.png',
      data: { url: datos.url || '/' },
    }),
  );
});

// Al tocarla, abre la app (o la trae al frente si ya estaba abierta).
self.addEventListener('notificationclick', (evento) => {
  evento.notification.close();
  evento.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ventanas) => {
      const abierta = ventanas.find((v) => new URL(v.url).origin === location.origin);
      return abierta ? abierta.focus() : self.clients.openWindow(evento.notification.data?.url || '/');
    }),
  );
});
