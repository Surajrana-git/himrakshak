// Network first, cache as fallback: in the hills the last risk map you saw is
// still there when the signal drops. Bump VERSION to throw away old copies.
const VERSION = "v2";
const APP_CACHE = `himrakshak-app-${VERSION}`;
const TILE_CACHE = `himrakshak-tiles-${VERSION}`;
const TILE_HOST = "tiles.openfreemap.org";
// Enough tiles for the whole route at the zoom levels people use; stops the phone filling up.
const MAX_TILES = 2500;
const PRECACHE = ["/", "/offline.html", "/icon.svg", "/icon-192.png", "/maplibre-gl-worker.mjs"];

self.addEventListener("install", (event) => {
  // One failed file must not block install, so add them one by one.
  event.waitUntil(
    caches
      .open(APP_CACHE)
      .then((cache) => Promise.all(PRECACHE.map((url) => cache.add(url).catch(() => {}))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== APP_CACHE && k !== TILE_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function trimTiles() {
  const cache = await caches.open(TILE_CACHE);
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_TILES)).map((k) => cache.delete(k)));
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      await cache.put(request, response.clone());
      if (cacheName === TILE_CACHE) trimTiles();
    }
    return response;
  } catch {
    const cached = await caches.match(request, { ignoreVary: true });
    if (cached) return cached;
    if (request.mode === "navigate") return (await caches.match("/")) || (await caches.match("/offline.html"));
    return Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.hostname === self.location.hostname) event.respondWith(networkFirst(request, APP_CACHE));
  else if (url.hostname === TILE_HOST) event.respondWith(networkFirst(request, TILE_CACHE));
  // Everything else (Supabase, Open-Meteo) always goes live.
});
