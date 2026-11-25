/**
 * E-Ink 電子書閱讀器離線快取腳本 (Service Worker)
 * 每次更新 index.html 上傳至 GitHub 時，請將下方的版本號調高，
 * 讓電子紙或手機端自動清除舊快取並載入最新版畫面。
 */

const CACHE_NAME = 'eink-reader-offline-v18';

// 核心必備檔案清單
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './bookmark_2.png',
  './libs/jszip.min.js',
  './libs/epub.min.js'
];

// 選配檔案清單（若資料夾內有放置才會快取，缺少時不會影響安裝）
const OPTIONAL_ASSETS = [
  './libs/opencc.min.js'
];

/**
 * 安裝階段：逐一快取檔案，避免單一檔案不存在導致整體離線快取失敗
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      const allAssets = [...CORE_ASSETS, ...OPTIONAL_ASSETS];
      await Promise.all(
        allAssets.map((url) =>
          cache.add(url).catch(() => {
            // 略過不存在的選配資源，確保核心離線功能正常啟用
          })
        )
      );
    })
  );
  self.skipWaiting();
});

/**
 * 啟用階段：自動清除所有舊版本的快取空間
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

/**
 * 攔截請求：優先讀取本機離線快取，斷網時自動回傳主畫面
 */
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const reqUrl = new URL(event.request.url);
  if (reqUrl.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone).catch(() => {});
            });
          }
          return networkResponse;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});