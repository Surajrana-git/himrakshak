import { distanceKm } from "@/lib/geo";

export type FuelStop = { name: string; lat: number; lon: number; cng: boolean; km: number }; // km: from the start

const NEAR_ROAD_KM = 1.5;
const HEADERS = { "User-Agent": "Himrakshak road safety app" };

// Points every ~20 km along the road; each gets a small search box.
function samples(line: number[][]): { lat: number; lon: number; km: number }[] {
  const out = [{ lon: line[0][0], lat: line[0][1], km: 0 }];
  let km = 0;
  let last = 0;
  for (let i = 1; i < line.length; i++) {
    km += distanceKm(line[i - 1][1], line[i - 1][0], line[i][1], line[i][0]);
    if (km - last >= 20 || i === line.length - 1) {
      out.push({ lon: line[i][0], lat: line[i][1], km });
      last = km;
    }
  }
  return out.slice(0, 16);
}

// Distance along the road (km) of the road point closest to the pump, and how far off the road it is.
function onRoute(line: number[][], lat: number, lon: number): { off: number; km: number } {
  let best = { off: Infinity, km: 0 };
  let km = 0;
  for (let i = 0; i < line.length; i++) {
    if (i > 0) km += distanceKm(line[i - 1][1], line[i - 1][0], line[i][1], line[i][0]);
    const d = distanceKm(lat, lon, line[i][1], line[i][0]);
    if (d < best.off) best = { off: d, km };
  }
  return best;
}

type OverpassEl = { lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> };
type PhotonFeature = { geometry: { coordinates: [number, number] }; properties: { name?: string; street?: string; city?: string } };

// Petrol pumps and CNG stations within 1.5 km of the road (OpenStreetMap). Overpass knows which
// pumps sell CNG; if it is busy, Photon still finds the pumps (CNG then only from the name).
export async function fuelAlong(line: number[][]): Promise<FuelStop[]> {
  const pts = samples(line);
  const raw: { name: string; lat: number; lon: number; cng: boolean }[] = [];

  const boxes = pts.map((p) => `(${(p.lat - 0.1).toFixed(3)},${(p.lon - 0.1).toFixed(3)},${(p.lat + 0.1).toFixed(3)},${(p.lon + 0.1).toFixed(3)})`);
  const query = `[out:json][timeout:20];(${boxes.map((b) => `nwr["amenity"="fuel"]${b};`).join("")});out center tags;`;
  const overpass = await fetch("https://overpass-api.de/api/interpreter", { method: "POST", headers: HEADERS, body: new URLSearchParams({ data: query }), signal: AbortSignal.timeout(12000) })
    .then((r) => (r.ok ? (r.json() as Promise<{ elements: OverpassEl[] }>) : null))
    .catch(() => null);

  if (overpass?.elements?.length) {
    for (const e of overpass.elements) {
      const lat = e.lat ?? e.center?.lat;
      const lon = e.lon ?? e.center?.lon;
      if (lat === undefined || lon === undefined) continue;
      const t = e.tags ?? {};
      const name = t.name ?? t.brand ?? "Petrol pump";
      raw.push({ name, lat, lon, cng: t["fuel:cng"] === "yes" || /cng/i.test(name) });
    }
  } else {
    const found = await Promise.all(
      pts.map((p) => {
        const params = new URLSearchParams({ q: "fuel", osm_tag: "amenity:fuel", limit: "15", bbox: `${p.lon - 0.1},${p.lat - 0.1},${p.lon + 0.1},${p.lat + 0.1}` });
        return fetch(`https://photon.komoot.io/api/?${params}`, { headers: HEADERS, signal: AbortSignal.timeout(10000) })
          .then((r) => (r.ok ? (r.json() as Promise<{ features: PhotonFeature[] }>) : { features: [] }))
          .catch(() => ({ features: [] as PhotonFeature[] }));
      }),
    );
    for (const f of found.flatMap((x) => x.features)) {
      const [lon, lat] = f.geometry.coordinates;
      const name = f.properties.name ?? "Petrol pump";
      raw.push({ name, lat, lon, cng: /cng/i.test(name) });
    }
  }

  const stops: FuelStop[] = [];
  for (const r of raw) {
    if (stops.some((s) => distanceKm(s.lat, s.lon, r.lat, r.lon) < 0.15)) continue; // same pump twice
    const where = onRoute(line, r.lat, r.lon);
    if (where.off <= NEAR_ROAD_KM) stops.push({ ...r, km: Math.round(where.km) });
  }
  return stops.sort((a, b) => a.km - b.km).slice(0, 60);
}
