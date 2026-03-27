let CACHE_NAME = 'orderly-dex-v1';
const CACHE_VERSION = 'v1';
let cacheNameInitialized = false;

const NEVER_CACHE = ['/', '/index.html', '/config.js'];

async function initializeCacheName() {
  if (cacheNameInitialized) {
    return;
  }

  try {
    const response = await fetch('/config.js');
    const configText = await response.text();
    
    const jsonText = configText
      .replace(/window\.__RUNTIME_CONFIG__\s*=\s*/, '')
      .replace(/;$/, '')
      .trim();
    
    const config = JSON.parse(jsonText);
    const brokerId = config.VITE_ORDERLY_BROKER_ID || 'orderly';
    
    CACHE_NAME = `${brokerId}-dex-${CACHE_VERSION}`;
    cacheNameInitialized = true;
    console.log('Service Worker cache name:', CACHE_NAME);
  } catch (error) {
    console.warn('Failed to load config, using default cache name:', error);
    CACHE_NAME = `orderly-dex-${CACHE_VERSION}`;
    cacheNameInitialized = true;
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(initializeCacheName());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    initializeCacheName().then(() => {
      return caches.keys().then((cacheNames) => {
        return Promise.all([
          ...cacheNames
            .filter((name) => !name.endsWith(`-${CACHE_VERSION}`) && name !== CACHE_NAME)
            .map((name) => {
              console.log('Deleting old cache:', name);
              return caches.delete(name);
            }),
          caches.open(CACHE_NAME).then((cache) => {
            return cache.keys().then((keys) => {
              return Promise.all(
                keys
                  .filter((req) => {
                    const path = new URL(req.url).pathname;
                    return NEVER_CACHE.includes(path) || NEVER_CACHE.some(blacklisted => path.endsWith(blacklisted));
                  })
                  .map((req) => cache.delete(req))
              );
            });
          }).catch(() => {})
        ]);
      });
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  if (url.pathname.includes('/sw.js') || url.pathname.includes('/manifest.json')) {
    return;
  }

  if (NEVER_CACHE.includes(url.pathname) || NEVER_CACHE.some(blacklisted => url.pathname.endsWith(blacklisted))) {
    event.respondWith(fetch(request).catch(() => caches.match(request)));
    return;
  }

  const isModuleRequest = /\.(js|mjs|ts)$/i.test(url.pathname) || 
                          request.destination === 'script' ||
                          request.destination === 'worker';
  
  const isHashedModule = isModuleRequest && 
                         /\/assets\/.*-[A-Za-z0-9_-]{8,}\.(js|mjs)$/.test(url.pathname);
  
  if (isModuleRequest && !isHashedModule) {
    return;
  }

  event.respondWith(
    initializeCacheName().then(() => {
      if (isHashedModule) {
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(request).then((response) => {
            if (response && response.status === 200 && response.type === 'basic') {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseToCache).catch((err) => {
                  console.warn('Failed to cache hashed module:', url.pathname, err);
                });
              });
            }
            return response;
          });
        });
      }

      return fetch(request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const isStaticAsset = /\.(woff2?|png|jpg|jpeg|svg|webp|ico|css)$/i.test(url.pathname);
            
            if (isStaticAsset) {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseToCache).catch((err) => {
                  console.warn('Failed to cache response:', url.pathname, err);
                });
              });
            }
          }

          return response;
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            throw new Error(`Failed to fetch ${url.pathname}`);
          });
        });
    }).catch((error) => {
      console.warn('Service worker fetch handler error:', url.pathname, error.message);
      throw error;
    })
  );
});

