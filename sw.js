/**
 * Service Worker Oficial — TERRAS RARAS PWA
 * Responsável pelo cache offline e atualização automática de versões.
 * Livre de dependências de window, document ou speechSynthesis.
 */

const CACHE_VERSION = 'terras-raras-v1.0.0';
const STATIC_ASSETS = [
  './',
  './index.html',
  './missao.html',
  './conquistas.html',
  './historico.html',
  './configuracoes.html',
  './style.css',
  './app.js',
  './manifest.json',
  './assets/terras-raras-banner.jpg',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon.svg'
];

// Instalação: pré-cache de todos os arquivos essenciais e ativação imediata
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Ativação: remove caches antigos para evitar exibição de arquivos desatualizados
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_VERSION)
            .map((oldCache) => caches.delete(oldCache))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Estratégia Network-First para HTML/JS/CSS (garante versões novas quando online)
// com fallback imediato para Cache quando offline
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_VERSION).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return new Response('Conteúdo indisponível offline.', {
            status: 503,
            statusText: 'Offline'
          });
        });
      })
  );
});

// Permite forçar atualização a partir da interface se solicitado
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
