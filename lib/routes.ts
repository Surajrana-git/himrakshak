import { cacheLife } from "next/cache";
import { roadRoute, type Costing, type Point, type RoadRoute } from "@/lib/valhalla";
import { getRain } from "@/lib/weather";
import { distanceKm } from "@/lib/geo";
import { getTerrain } from "@/lib/terrain";
import { riskLevel, segmentScore, withSimulatedStorm, type RiskLevel } from "@/lib/risk";

export type RouteStretch = { start: number; end: number; score: number; level: RiskLevel }; // coordinate indexes

export type RouteOption = RoadRoute & {
  id: string;
  risk: number; // worst stretch on the route, now + next 6 h (0–100)
  level: RiskLevel;
  stretches: RouteStretch[]; // ~10 km pieces, so the map can colour where the danger is
  steepestDeg: number | null; // steepest stretch's mean hillside slope
  pastSlides: number; // NASA catalog slides within 2 km of the road
  fastest: boolean;
  safest: boolean;
};

export type Storm = { mmPerHour: number; hours: number };

const STRETCH_KM = 10;

// Cut the road into ~10 km stretches (Open-Meteo rain is ~10 km resolution, so finer adds nothing).
function cutStretches(coordinates: number[][]): { start: number; end: number }[] {
  const out: { start: number; end: number }[] = [];
  let start = 0;
  let km = 0;
  for (let i = 1; i < coordinates.length; i++) {
    const [lon0, lat0] = coordinates[i - 1];
    const [lon, lat] = coordinates[i];
    km += distanceKm(lat0, lon0, lat, lon);
    if (km >= STRETCH_KM || i === coordinates.length - 1) {
      out.push({ start, end: i });
      start = i;
      km = 0;
    }
  }
  return out.length ? out : [{ start: 0, end: coordinates.length - 1 }];
}

// Rain points snap to a 0.1° grid (Open-Meteo's own resolution is ~10 km), so the three route
// options, which share most of their road, need one small request instead of three big ones.
const gridKey = (p: Point) => `${p.lat.toFixed(1)},${p.lon.toFixed(1)}`;

// The same formula as the watched highways: rain × slope × history, for every stretch of each road.
async function scoreRoutes(routes: RoadRoute[], storm: Storm) {
  const pieces = routes.map((route) =>
    cutStretches(route.coordinates).map((c) => {
      const line = route.coordinates.slice(c.start, c.end + 1);
      const [lon, lat] = line[Math.floor(line.length / 2)];
      return { ...c, key: gridKey({ lat, lon }), terrain: getTerrain(line) };
    }),
  );
  const keys = [...new Set(pieces.flat().map((p) => p.key))];
  const rain = await getRain(keys.map((k) => ({ lat: Number(k.split(",")[0]), lon: Number(k.split(",")[1]) })));
  const series = withSimulatedStorm(rain.mm, rain.nowIndex, storm.mmPerHour, storm.hours);

  return pieces.map((route) => {
    const stretches = route.map((p) => {
      const score = segmentScore(series[keys.indexOf(p.key)], rain.nowIndex, p.terrain.slopeFactor, p.terrain.historyFactor);
      return { start: p.start, end: p.end, score, level: riskLevel(score) };
    });
    const slopes = route.map((p) => p.terrain.slopeDeg).filter((d): d is number => d !== null);
    return {
      risk: Math.max(...stretches.map((s) => s.score)),
      stretches,
      steepestDeg: slopes.length ? Math.max(...slopes) : null,
      pastSlides: route.reduce((n, p) => n + p.terrain.pastSlides, 0),
    };
  });
}

// Up to 3 real road options from A to B that avoid every closed spot, scored by landslide risk.
export async function getRouteOptions(from: Point, to: Point, closed: Point[], storm: Storm, costing: Costing = "auto"): Promise<RouteOption[]> {
  "use cache";
  cacheLife("minutes");

  const direct = await roadRoute(from, to, closed, costing);
  if (!direct) return [];

  // The public Valhalla server returns no alternates, so ask again with one third of the
  // direct road closed: that surfaces the real other valleys (Tehri, Pauri, Ukhimath roads).
  const cuts = [1 / 3, 2 / 3].map((f) => {
    const [lon, lat] = direct.coordinates[Math.floor(direct.coordinates.length * f)];
    return { lat, lon };
  });
  const alternates = await Promise.all(cuts.map((cut) => roadRoute(from, to, [...closed, cut], costing).catch(() => null)));

  const routes: RoadRoute[] = [direct];
  for (const alt of alternates) {
    if (!alt || alt.km > direct.km * 2) continue; // a 2x detour is not a real option
    const duplicate = routes.some((r) => Math.abs(r.km - alt.km) <= r.km * 0.02 && r.roads.join() === alt.roads.join());
    if (!duplicate) routes.push(alt);
  }

  const scored = await scoreRoutes(routes, storm);
  const risks = scored.map((s) => s.risk);
  const fastestHours = Math.min(...routes.map((r) => r.hours));
  const lowestRisk = Math.min(...risks);
  // Among the routes with the lowest risk, the quickest one is "safest".
  const safestIndex = routes.reduce(
    (best, r, i) => (risks[i] === lowestRisk && (best < 0 || r.hours < routes[best].hours) ? i : best),
    -1,
  );

  return routes.map((r, i) => ({
    ...r,
    ...scored[i],
    id: `option-${i}`,
    level: riskLevel(risks[i]),
    fastest: r.hours === fastestHours,
    safest: i === safestIndex,
  }));
}
