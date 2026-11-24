// Network first, cache as fallback: in the hills the last risk map you saw is
// still there when the signal drops. Bump CACHE to throw away old copies.
const CACHE = "himrakshak-v1";
const CACHEABLE_HOSTS = [self.location.hostname, "tiles.openfreemap.org"];

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (!CACHEABLE_HOSTS.includes(url.hostname)) return; // e.g. Supabase: always live

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || Response.error())),
  );
});
