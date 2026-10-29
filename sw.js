/* Aumentar VERSION cuando cambien los archivos de esta candidata. */
const VERSION = 'corte-legendaria-prueba-20261029-v6';
const PREFIX = 'corte-legendaria-prueba-';
const RESOURCES = [
  './','./index.html','./styles.css','./core.js','./efectos.js','./app.js','./manifest.webmanifest',
  './assets/foto1.jpg','./assets/foto2.jpg','./assets/foto3.jpg','./assets/foto4.jpg','./assets/foto5.jpg','./assets/titulo-monopoly.png',
  './assets/icon.svg','./assets/icon-192.png','./assets/icon-512.png','./assets/icon-maskable-512.png','./assets/apple-touch-icon.png'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(RESOURCES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== VERSION).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  const scopedResources = RESOURCES.map(path => new URL(path,self.registration.scope).href);
  const withoutQuery = new URL(url.href);
  withoutQuery.search = '';
  if (!scopedResources.includes(withoutQuery.href)) return;
  event.respondWith(caches.open(VERSION).then(cache => cache.match(event.request,{ignoreSearch:true})).then(cached => cached || fetch(event.request)));
});
