// Service Worker mínimo del Sistema de Ventas.
// Su único trabajo es cumplir el requisito de Android/Chrome para
// que la página se reconozca como "app instalable" de verdad.
//
// Estrategia: red primero, caché como respaldo solo si no hay
// internet. Así SIEMPRE ves la versión más reciente de tu app
// cuando hay conexión, y nunca te quedas "pegado" en una versión
// vieja. Los datos de ventas (que vienen de tu Google Sheet) nunca
// se tocan aquí: esas peticiones van a otro dominio y este archivo
// las deja pasar sin intervenir.

const CACHE_NAME = 'sistema-ventas-v1';
const ARCHIVOS_DE_LA_INTERFAZ = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ARCHIVOS_DE_LA_INTERFAZ))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((nombres) =>
      Promise.all(
        nombres
          .filter((n) => n !== CACHE_NAME)
          .map((n) => caches.delete(n))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Solo nos encargamos de archivos de NUESTRA propia página (mismo
  // origen). Cualquier llamada a Google Apps Script (Sheets) es de
  // otro dominio y la dejamos pasar normal, sin tocarla.
  if (url.origin !== self.location.origin) return;
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((respuestaRed) => {
        const copia = respuestaRed.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copia));
        return respuestaRed;
      })
      .catch(() => caches.match(event.request))
  );
});
