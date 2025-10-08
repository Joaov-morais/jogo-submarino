const CACHE_NAME = 'eco-raiders-v2'; // Mudei a versão para forçar a atualização
const urlsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/manifest.json',
    '/audio/musica.mp3',
    'assets/Logo.png', // NOVA IMAGEM ADICIONADA
    '/assets/submarino2d.png',
    '/assets/bolha2d.png',
    '/assets/oceano.png',
    '/assets/banana2d.png',
    '/assets/garrafa2d.png',
    '/assets/latinha2d.png',
    '/assets/pneu2d.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache aberto');
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                return response || fetch(event.request);
            })
    );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          return cacheName.startsWith('eco-raiders-') && cacheName !== CACHE_NAME;
        }).map(cacheName => {
          return caches.delete(cacheName);
        })
      );
    })
  );
});