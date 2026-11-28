"use client";

// Same cache the service worker reads map tiles from (public/sw.js), so saved tiles show offline.
const TILE_CACHE = "himrakshak-tiles-v5";
const STORE = "himrakshak-offline-maps";

export type Region = { id: string; name: string; west: number; south: number; east: number; north: number; maxZoom: number };
export type Downloaded = { id: string; bytes: number; tiles: number; at: string };

// Whole state at overview zoom; the busiest districts close enough to read the roads.
export const REGIONS: Region[] = [
  { id: "uttarakhand", name: "Uttarakhand", west: 77.5, south: 28.7, east: 81.1, north: 31.5, maxZoom: 9 },
  { id: "haridwar", name: "Haridwar", west: 77.85, south: 29.7, east: 78.3, north: 30.1, maxZoom: 12 },
  { id: "rudraprayag", name: "Rudraprayag", west: 78.8, south: 30.2, east: 79.3, north: 30.8, maxZoom: 12 },
  { id: "chamoli", name: "Chamoli (Badrinath)", west: 79.2, south: 30.2, east: 79.9, north: 30.9, maxZoom: 11 },
];

function tileRange(r: Region, z: number) {
  const n = 2 ** z;
  const x = (lon: number) => Math.floor(((lon + 180) / 360) * n);
  const y = (lat: number) => {
    const rad = (lat * Math.PI) / 180;
    return Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n);
  };
  return { x0: x(r.west), x1: x(r.east), y0: y(r.north), y1: y(r.south) };
}

export function tileCount(r: Region): number {
  let count = 0;
  for (let z = 5; z <= r.maxZoom; z++) {
    const t = tileRange(r, z);
    count += (t.x1 - t.x0 + 1) * (t.y1 - t.y0 + 1);
  }
  return count;
}

export function downloadedRegions(): Downloaded[] {
  try {
    return JSON.parse(localStorage.getItem(STORE) ?? "[]");
  } catch {
    return [];
  }
}

// Fetches every map tile of the region into the phone's cache. Reports progress 0–1.
export async function downloadRegion(r: Region, onProgress: (done: number, total: number) => void): Promise<Downloaded> {
  const tilejson = await fetch("https://tiles.openfreemap.org/planet").then((res) => res.json() as Promise<{ tiles: string[] }>);
  const template = tilejson.tiles[0];
  const urls: string[] = [];
  for (let z = 5; z <= r.maxZoom; z++) {
    const t = tileRange(r, z);
    for (let x = t.x0; x <= t.x1; x++) for (let y = t.y0; y <= t.y1; y++) urls.push(template.replace("{z}", String(z)).replace("{x}", String(x)).replace("{y}", String(y)));
  }
  const cache = await caches.open(TILE_CACHE);
  let bytes = 0;
  let done = 0;
  // Six at a time: quick, without flooding a weak mountain connection.
  for (let i = 0; i < urls.length; i += 6) {
    await Promise.all(
      urls.slice(i, i + 6).map(async (url) => {
        const res = await fetch(url).catch(() => null);
        if (res?.status === 200) {
          const copy = res.clone();
          bytes += (await res.arrayBuffer()).byteLength;
          await cache.put(url, copy);
        }
        done++;
      }),
    );
    onProgress(done, urls.length);
  }
  const result = { id: r.id, bytes, tiles: urls.length, at: new Date().toISOString() };
  try {
    localStorage.setItem(STORE, JSON.stringify([...downloadedRegions().filter((d) => d.id !== r.id), result]));
  } catch {}
  return result;
}
