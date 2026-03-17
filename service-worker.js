// Define um nome e versão para o cache. 
// Mude este nome (ex: 'v7') quando atualizar os arquivos do jogo.
const CACHE_NAME = 'eco-raiders-v6'; // Versão do cache atualizada

// Lista de todos os arquivos essenciais para o jogo funcionar offline.
const urlsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/manifest.json',
    '/audio/musica.mp3',
    'assets/logo_menor.png',
    '/assets/submarino2d.png',
    '/assets/bolha2d.png',
    '/assets/oceano.png',
    '/assets/banana2d.png',
    '/assets/garrafa2d.png',
    '/assets/latinha2d.png',
    '/assets/pneu2d.png'
];
// // Evento 'install': É disparado quando o Service Worker é instalado pela primeira vez.
self.addEventListener('install', event => {
  //'event.waitUntil' espera a Promise terminar antes de considerar a instalação concluída.
    event.waitUntil(
        caches.open(CACHE_NAME) // Abre o cache com o nome definido
            .then(cache => {
                console.log('Cache aberto');
                // Adiciona todos os arquivos listados ao cache
                return cache.addAll(urlsToCache);
            })
    );
});
// Evento 'fetch': Intercepta todas as requisições de rede.
self.addEventListener('fetch', event => {
    event.respondWith(
      // // Procura no cache se a requisição já existe.
        caches.match(event.request)
            .then(response => {
              // Se 'response' existir (arquivo encontrado no cache), retorna o arquivo do cache.
                // Se não ('||'), faz a requisição normal à rede ('fetch').
                // Isso é a estratégia "Cache First" (Cache Primeiro).
                return response || fetch(event.request);
            })
    );
});
// Evento 'activate': É disparado quando o novo Service Worker é ativado.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      // Retorna uma Promise que espera todas as limpezas terminarem.
      return Promise.all(
        // Filtra a lista de todos os caches
        cacheNames.filter(cacheName => {
          // Mantém apenas os caches que começam com 'eco-raiders-' mas NÃO são o cache atual
          return cacheName.startsWith('eco-raiders-') && cacheName !== CACHE_NAME;
        }).map(cacheName => {
          // Isso deleta os caches antigos (como o v6)
          return caches.delete(cacheName);
        })
      );
    })
  );
});