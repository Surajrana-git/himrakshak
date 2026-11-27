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
export type SatelliteView = { now: SatellitePhoto | null; before: SatellitePhoto | null };

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
  if (!latest) return { now: null, before: null };
  const cutoff = new Date(latest.properties.datetime).getTime() - BEFORE_GAP_DAYS * 86400_000;
  const older = items.filter((i) => new Date(i.properties.datetime).getTime() <= cutoff);
  const before = older.sort((a, b) => a.properties["eo:cloud_cover"] - b.properties["eo:cloud_cover"])[0];
  return { now: photo(latest, bbox), before: before ? photo(before, bbox) : null };
}
