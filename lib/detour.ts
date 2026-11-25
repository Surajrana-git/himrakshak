import { cacheLife } from "next/cache";

export type Block = { lat: number; lon: number };

export type Detour =
  | { found: true; coordinates: number[][]; km: number; hours: number; roads: string[]; normalKm: number; normalHours: number }
  | { found: false; normalKm: number; normalHours: number };

// Valhalla (open source, github.com/valhalla/valhalla) on the free public OSM server: no key.
// Unlike OSRM it can route around areas we mark as closed.
const VALHALLA = "https://valhalla1.openstreetmap.de/route";
const START = { lat: 30.0869, lon: 78.2676 }; // Rishikesh
const END = { lat: 30.7433, lon: 79.4938 }; // Badrinath
// ~1 km each way: wide enough that small local lanes beside the highway cannot bypass it.
const HALF_BOX_DEG = 0.01;

type ValhallaTrip = {
  trip?: {
    summary: { length: number; time: number };
    legs: { shape: string; maneuvers: { street_names?: string[] }[] }[];
  };
  error?: string;
};

// Valhalla sends the line as an encoded polyline with 6 decimal places.
function decodePolyline6(encoded: string): number[][] {
  const coordinates: number[][] = [];
  let index = 0;
  let lat = 0;
  let lon = 0;
  while (index < encoded.length) {
    for (const axis of [0, 1]) {
      let shift = 0;
      let result = 0;
      let byte: number;
      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);
      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      if (axis === 0) lat += delta;
      else lon += delta;
    }
    coordinates.push([lon / 1e6, lat / 1e6]);
  }
  return coordinates;
}

async function route(blocks: Block[]): Promise<ValhallaTrip> {
  const request = {
    locations: [START, END],
    costing: "auto",
    units: "kilometers",
    exclude_polygons: blocks.map(({ lat, lon }) => [
      [lon - HALF_BOX_DEG, lat - HALF_BOX_DEG],
      [lon + HALF_BOX_DEG, lat - HALF_BOX_DEG],
      [lon + HALF_BOX_DEG, lat + HALF_BOX_DEG],
      [lon - HALF_BOX_DEG, lat + HALF_BOX_DEG],
      [lon - HALF_BOX_DEG, lat - HALF_BOX_DEG],
    ]),
  };
  const res = await fetch(`${VALHALLA}?json=${encodeURIComponent(JSON.stringify(request))}`, {
    headers: { "User-Agent": "himrakshak-hackathon-prototype" },
  });
  // Valhalla answers 400 with an error when no road gets around the closure.
  if (!res.ok && res.status !== 400) throw new Error(`Valhalla returned ${res.status}`);
  return res.json();
}

const round1 = (n: number) => Math.round(n * 10) / 10;

// Valhalla gives a point every few metres (~10k for this trip); one per ~50 m is plenty on a phone map.
function thin(coordinates: number[][]): number[][] {
  const kept = [coordinates[0]];
  for (const point of coordinates) {
    const last = kept[kept.length - 1];
    if (Math.abs(point[0] - last[0]) + Math.abs(point[1] - last[1]) > 0.0005) kept.push(point);
  }
  kept.push(coordinates[coordinates.length - 1]);
  return kept;
}

// Same closures → same answer, so cache it and stay well inside the public server's limits.
export async function getDetour(blocks: Block[]): Promise<Detour> {
  "use cache";
  cacheLife("minutes");

  const [normal, detour] = await Promise.all([route([]), route(blocks)]);
  if (!normal.trip) throw new Error(normal.error ?? "Valhalla found no normal route");
  const normalKm = Math.round(normal.trip.summary.length);
  const normalHours = round1(normal.trip.summary.time / 3600);
  if (!detour.trip) return { found: false, normalKm, normalHours };

  const roads: string[] = [];
  for (const m of detour.trip.legs[0].maneuvers) {
    for (const name of m.street_names ?? []) if (!roads.includes(name)) roads.push(name);
  }
  return {
    found: true,
    coordinates: thin(detour.trip.legs.flatMap((leg) => decodePolyline6(leg.shape))),
    km: Math.round(detour.trip.summary.length),
    hours: round1(detour.trip.summary.time / 3600),
    roads: roads.slice(0, 6),
    normalKm,
    normalHours,
  };
}
