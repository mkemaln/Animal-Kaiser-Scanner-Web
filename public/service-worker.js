const CACHE_NAME = 'ak-images-cache-v1';

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Cache external card images locally in browser storage
  if (url.pathname.endsWith('.jpg') || url.pathname.endsWith('.png') || url.search.includes('fit=')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) return cachedResponse;

        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        } catch {
          return new Response('', { status: 408 });
        }
      })
    );
  }
});