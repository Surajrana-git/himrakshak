import { cacheLife } from "next/cache";

// Real Sentinel-2 photos (ESA, 10 m per pixel, a new pass every ~5 days), found with Element84
// Earth Search (AWS open data, no key) and cut to the area with TiTiler (open source). No AI here:
// "before" vs "now" lets a person see fresh debris or a scar the way HazMapper does.
const STAC = "https://earth-search.aws.element84.com/v1/search";
const TILER = "https://titiler.xyz/cog/bbox";
const HALF_DEG = 0.015; // ~3 km across: the road, the slope above it and the river below
const MAX_CLOUD = 30;
const BEFORE_GAP_DAYS = 25;

export type SatellitePhoto = { date: string; cloud: number; imageUrl: string; tile: string };
// Bare ground = NDVI below 0.2 (no plants) in the 1 km around the spot; vegetation = mean NDVI.
export type GroundChange = { bareNowPct: number; bareBeforePct: number; ndviNow: number; ndviBefore: number; possibleSlide: boolean };
export type SatelliteView = { now: SatellitePhoto | null; before: SatellitePhoto | null; change: GroundChange | null };

type StacItem = { id: string; properties: { datetime: string; "eo:cloud_cover": number }; assets: { visual?: { href: string } } };

function photo(item: StacItem, bbox: number[]): SatellitePhoto | null {
  const href = item.assets.visual?.href;
  if (!href) return null;
  return {
    date: item.properties.datetime.slice(0, 10),
    cloud: Math.round(item.properties["eo:cloud_cover"]),
    imageUrl: `${TILER}/${bbox.join(",")}.png?url=${encodeURIComponent(href)}&max_size=640`,
    tile: item.id,
  };
}

const STATS = "https://titiler.xyz/stac/statistics";
const NDVI_HALF_DEG = 0.005; // ~1 km box: the slope right at the spot, not the whole valley
// HazMapper-style check without AI: a slide strips plants, so bare ground jumps and greenness falls.
const SLIDE_BARE_JUMP_PCT = 10;
const SLIDE_NDVI_DROP = 0.1;

async function groundCover(itemId: string, lat: number, lon: number): Promise<{ barePct: number; ndvi: number } | null> {
  const item = `https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/${itemId}`;
  const [w, s, e, n] = [lon - NDVI_HALF_DEG, lat - NDVI_HALF_DEG, lon + NDVI_HALF_DEG, lat + NDVI_HALF_DEG];
  // Bands: b1 = red, b2 = near-infrared; NDVI = (nir − red) / (nir + red). Bins of 0.2 from −1 to 1.
  const params = new URLSearchParams({ url: item, expression: "(b2-b1)/(b2+b1)", histogram_bins: "10", histogram_range: "-1,1" });
  params.append("assets", "red");
  params.append("assets", "nir");
  const res = await fetch(`${STATS}?${params}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]] } }),
  }).catch(() => null);
  if (!res?.ok) return null;
  const body: { properties: { statistics: Record<string, { mean: number; histogram: [number[], number[]] }> } } = await res.json();
  const stats = Object.values(body.properties.statistics)[0];
  const counts = stats.histogram[0];
  const total = counts.reduce((a, b) => a + b, 0);
  if (!total) return null;
  const bare = counts.slice(0, 6).reduce((a, b) => a + b, 0); // NDVI −1 … 0.2
  return { barePct: Math.round((bare / total) * 100), ndvi: Math.round(stats.mean * 100) / 100 };
}

export async function getSatelliteView(lat: number, lon: number): Promise<SatelliteView> {
  "use cache";
  cacheLife("hours");

  const bbox = [lon - HALF_DEG, lat - HALF_DEG, lon + HALF_DEG, lat + HALF_DEG].map((v) => Math.round(v * 1e5) / 1e5);
  const since = new Date(Date.now() - 120 * 86400_000).toISOString();
  const res = await fetch(STAC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      collections: ["sentinel-2-l2a"],
      intersects: { type: "Point", coordinates: [lon, lat] },
      datetime: `${since}/..`,
      query: { "eo:cloud_cover": { lt: MAX_CLOUD } },
      sortby: [{ field: "properties.datetime", direction: "desc" }],
      limit: 40,
    }),
  });
  if (!res.ok) throw new Error(`Earth Search returned ${res.status}`);
  const items: StacItem[] = (await res.json()).features ?? [];
  // "Now" is the newest pass under 30% cloud; "before" is the clearest pass at least 25 days older.
  const latest = items[0];
  if (!latest) return { now: null, before: null, change: null };
  const cutoff = new Date(latest.properties.datetime).getTime() - BEFORE_GAP_DAYS * 86400_000;
  const older = items.filter((i) => new Date(i.properties.datetime).getTime() <= cutoff);
  const before = older.sort((a, b) => a.properties["eo:cloud_cover"] - b.properties["eo:cloud_cover"])[0];
  const [coverNow, coverBefore] = before ? await Promise.all([groundCover(latest.id, lat, lon), groundCover(before.id, lat, lon)]) : [null, null];
  const change =
    coverNow && coverBefore
      ? {
          bareNowPct: coverNow.barePct,
          bareBeforePct: coverBefore.barePct,
          ndviNow: coverNow.ndvi,
          ndviBefore: coverBefore.ndvi,
          possibleSlide: coverNow.barePct - coverBefore.barePct >= SLIDE_BARE_JUMP_PCT && coverBefore.ndvi - coverNow.ndvi >= SLIDE_NDVI_DROP,
        }
      : null;
  return { now: photo(latest, bbox), before: before ? photo(before, bbox) : null, change };
}
