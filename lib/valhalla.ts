// Valhalla (open source, github.com/valhalla/valhalla) on the free public OSM server: no key.
// Unlike OSRM it can route around areas we mark as closed.
const VALHALLA = "https://valhalla1.openstreetmap.de/route";
// Up to ~1 km each way, so small lanes beside the highway cannot bypass a closure. The public
// server allows 10 km of polygon edge in total, so boxes shrink when there are several.
const MAX_HALF_BOX_DEG = 0.01;
const EDGE_BUDGET_KM = 9.5;
// Edge of a square box of half-size h degrees at ~30.5° N: 4h × 111 km × (1 + cos 30.5°) ≈ 826 h km.
const KM_PER_HALF_DEG = 826;
// Valhalla's "no path could be found" codes; any other 400 is our mistake, not a closed road.
const NO_PATH_CODES = [442, 443];

export type Point = { lat: number; lon: number };

// One turn instruction from Valhalla (narrated in Hindi), pinned to where it happens on the road.
export type Maneuver = { type: number; text: string; lon: number; lat: number; bearing: number | null; exit: number | null };

export type RoadRoute = { coordinates: number[][]; km: number; hours: number; roads: string[]; maneuvers: Maneuver[] };

type ValhallaResponse = {
  trip?: {
    summary: { length: number; time: number };
    legs: {
      shape: string;
      maneuvers: {
        type: number;
        instruction: string;
        begin_shape_index: number;
        bearing_after?: number;
        roundabout_exit_count?: number;
        street_names?: string[];
      }[];
    }[];
  };
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

// Valhalla gives a point every few metres (~10k for a long trip); one per ~50 m is plenty on a phone map.
function thin(coordinates: number[][]): number[][] {
  const kept = [coordinates[0]];
  for (const point of coordinates) {
    const last = kept[kept.length - 1];
    if (Math.abs(point[0] - last[0]) + Math.abs(point[1] - last[1]) > 0.0005) kept.push(point);
  }
  kept.push(coordinates[coordinates.length - 1]);
  return kept;
}

// Null when no road gets from A to B without crossing a closed spot.
export async function roadRoute(from: Point, to: Point, closed: Point[]): Promise<RoadRoute | null> {
  const request = {
    locations: [from, to],
    costing: "auto",
    units: "kilometers",
    language: "hi-IN",
    exclude_polygons: closed.map(({ lat, lon }) => {
      const h = Math.min(MAX_HALF_BOX_DEG, EDGE_BUDGET_KM / closed.length / KM_PER_HALF_DEG);
      return [
        [lon - h, lat - h],
        [lon + h, lat - h],
        [lon + h, lat + h],
        [lon - h, lat + h],
        [lon - h, lat - h],
      ];
    }),
  };
  const res = await fetch(`${VALHALLA}?json=${encodeURIComponent(JSON.stringify(request))}`, {
    headers: { "User-Agent": "himrakshak-hackathon-prototype" },
  });
  if (res.status === 400) {
    const { error_code, error }: { error_code?: number; error?: string } = await res.json();
    if (error_code !== undefined && NO_PATH_CODES.includes(error_code)) return null;
    throw new Error(`Valhalla: ${error ?? "bad request"}`);
  }
  if (!res.ok) throw new Error(`Valhalla returned ${res.status}`);
  const { trip }: ValhallaResponse = await res.json();
  if (!trip) return null;

  const roads: string[] = [];
  for (const m of trip.legs[0].maneuvers) {
    for (const name of m.street_names ?? []) if (!roads.includes(name)) roads.push(name);
  }
  const shape = decodePolyline6(trip.legs[0].shape);
  // Valhalla type 8 is "continue straight": not a decision point, so no junction guidance.
  const maneuvers = trip.legs[0].maneuvers
    .filter((m) => m.type !== 8 && m.type !== 1)
    .map((m) => {
      const [lon, lat] = shape[m.begin_shape_index];
      return { type: m.type, text: m.instruction, lon, lat, bearing: m.bearing_after ?? null, exit: m.roundabout_exit_count ?? null };
    });
  return {
    coordinates: thin(shape),
    maneuvers,
    km: Math.round(trip.summary.length),
    hours: Math.round((trip.summary.time / 3600) * 10) / 10,
    roads: roads.slice(0, 6),
  };
}
