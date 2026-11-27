/**
 * E-Ink 電子書閱讀器離線快取腳本 (Service Worker)
 * 每次更新 index.html 上傳至 GitHub 時，請將下方的版本號調高，
 * 讓電子紙或手機端自動清除舊快取並載入最新版畫面。
 */

const CACHE_NAME = 'eink-reader-offline-v27';

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './bookmark_2.png',
  './libs/jszip.min.js',
  './libs/epub.min.js'
];

const OPTIONAL_ASSETS = [
  './libs/opencc.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      const allAssets = [...CORE_ASSETS, ...OPTIONAL_ASSETS];
      await Promise.all(
        allAssets.map((url) => cache.add(url).catch(() => {}))
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const reqUrl = new URL(event.request.url);
  if (reqUrl.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone).catch(() => {});
            });
          }
          return networkResponse;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});