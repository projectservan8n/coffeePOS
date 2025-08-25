// Coffee POS Service Worker
// Provides offline functionality and caching

console.log('[DEBUG] SW - Service Worker script loaded');
console.log('[DEBUG] SW - Service Worker version: Coffee POS v1.0');

const CACHE_NAME = 'coffee-pos-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js'
];

console.log('[DEBUG] SW - Configuration loaded:', {
  cacheName: CACHE_NAME,
  urlsToCache: urlsToCache,
  urlCount: urlsToCache.length
});

// Log service worker registration
self.addEventListener('message', (event) => {
  console.log('[DEBUG] SW - Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[DEBUG] SW - Skip waiting requested');
    self.skipWaiting();
  }
});

// Log when service worker takes control
self.addEventListener('controllerchange', () => {
  console.log('[DEBUG] SW - Controller changed - service worker now controlling page');
});

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('[DEBUG] SW Install - Event triggered');
  console.log('[DEBUG] SW Install - Cache name:', CACHE_NAME);
  console.log('[DEBUG] SW Install - URLs to cache:', urlsToCache);
  
  const startTime = Date.now();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        const cacheOpenTime = Date.now();
        console.log(`[DEBUG] SW Install - Cache opened in ${cacheOpenTime - startTime}ms`);
        console.log('[DEBUG] SW Install - Adding URLs to cache...');
        
        return cache.addAll(urlsToCache)
          .then(() => {
            const endTime = Date.now();
            console.log(`[DEBUG] SW Install - All resources cached successfully in ${endTime - startTime}ms`);
            console.log('[DEBUG] SW Install - Cache installation complete');
          });
      })
      .catch((error) => {
        const endTime = Date.now();
        console.error(`[DEBUG] SW Install - Cache install failed after ${endTime - startTime}ms:`, error);
        console.error('[DEBUG] SW Install - Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      })
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const startTime = Date.now();
  
  console.log(`[DEBUG] SW Fetch - Request: ${event.request.method} ${event.request.url}`);
  console.log('[DEBUG] SW Fetch - Request details:', {
    method: event.request.method,
    destination: event.request.destination,
    mode: event.request.mode,
    cache: event.request.cache,
    credentials: event.request.credentials
  });
  
  // Skip cross-origin requests entirely to avoid CSP issues
  if (url.origin !== location.origin) {
    console.log('[DEBUG] SW Fetch - Skipping cross-origin request:', url.origin);
    return;
  }
  
  console.log('[DEBUG] SW Fetch - Handling same-origin request');
  
  // Only handle same-origin requests
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        const cacheCheckTime = Date.now();
        console.log(`[DEBUG] SW Fetch - Cache lookup completed in ${cacheCheckTime - startTime}ms`);
        
        // Return cached version or fetch from network
        if (response) {
          console.log('[DEBUG] SW Fetch - Serving from cache:', event.request.url);
          console.log('[DEBUG] SW Fetch - Cache response details:', {
            status: response.status,
            statusText: response.statusText,
            type: response.type
          });
          return response;
        }
        
        console.log('[DEBUG] SW Fetch - Not in cache, fetching from network');
        return fetch(event.request)
          .then((networkResponse) => {
            const networkTime = Date.now();
            console.log(`[DEBUG] SW Fetch - Network response received in ${networkTime - cacheCheckTime}ms`);
            console.log('[DEBUG] SW Fetch - Network response details:', {
              status: networkResponse.status,
              statusText: networkResponse.statusText,
              type: networkResponse.type
            });
            return networkResponse;
          })
          .catch((networkError) => {
            console.error('[DEBUG] SW Fetch - Network request failed:', networkError);
            throw networkError;
          });
      })
      .catch((error) => {
        const errorTime = Date.now();
        console.error(`[DEBUG] SW Fetch - Request failed after ${errorTime - startTime}ms:`, error);
        console.error('[DEBUG] SW Fetch - Error details:', {
          name: error.name,
          message: error.message,
          url: event.request.url
        });
        
        // If both cache and network fail, return offline page
        if (event.request.destination === 'document') {
          console.log('[DEBUG] SW Fetch - Attempting to serve offline page');
          return caches.match('/index.html')
            .then((offlineResponse) => {
              if (offlineResponse) {
                console.log('[DEBUG] SW Fetch - Serving offline page from cache');
                return offlineResponse;
              }
              console.error('[DEBUG] SW Fetch - Offline page not available in cache');
              throw new Error('Offline page not available');
            });
        }
        
        console.error('[DEBUG] SW Fetch - No fallback available for non-document request');
        throw error;
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[DEBUG] SW Activate - Event triggered');
  console.log('[DEBUG] SW Activate - Current cache name:', CACHE_NAME);
  
  const startTime = Date.now();
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      const keysTime = Date.now();
      console.log(`[DEBUG] SW Activate - Retrieved cache keys in ${keysTime - startTime}ms`);
      console.log('[DEBUG] SW Activate - Found caches:', cacheNames);
      
      const oldCaches = cacheNames.filter(cacheName => cacheName !== CACHE_NAME);
      console.log('[DEBUG] SW Activate - Old caches to delete:', oldCaches);
      
      if (oldCaches.length === 0) {
        console.log('[DEBUG] SW Activate - No old caches to delete');
        return Promise.resolve();
      }
      
      return Promise.all(
        oldCaches.map((cacheName) => {
          console.log('[DEBUG] SW Activate - Deleting old cache:', cacheName);
          return caches.delete(cacheName)
            .then((deleted) => {
              if (deleted) {
                console.log(`[DEBUG] SW Activate - Successfully deleted cache: ${cacheName}`);
              } else {
                console.warn(`[DEBUG] SW Activate - Failed to delete cache: ${cacheName}`);
              }
              return deleted;
            })
            .catch((error) => {
              console.error(`[DEBUG] SW Activate - Error deleting cache ${cacheName}:`, error);
              throw error;
            });
        })
      ).then((results) => {
        const endTime = Date.now();
        const deletedCount = results.filter(Boolean).length;
        console.log(`[DEBUG] SW Activate - Cache cleanup completed in ${endTime - startTime}ms`);
        console.log(`[DEBUG] SW Activate - Deleted ${deletedCount}/${oldCaches.length} old caches`);
      });
    })
    .catch((error) => {
      const endTime = Date.now();
      console.error(`[DEBUG] SW Activate - Activation failed after ${endTime - startTime}ms:`, error);
      console.error('[DEBUG] SW Activate - Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    })
  );
  
  console.log('[DEBUG] SW Activate - Service worker activation complete');
});