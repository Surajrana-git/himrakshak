import { cacheLife } from "next/cache";
import { roadRoute, type Point, type RoadRoute } from "@/lib/valhalla";
import { getRain } from "@/lib/weather";
import { distanceKm } from "@/lib/geo";
import { riskLevel, segmentScore, withSimulatedStorm, type RiskLevel } from "@/lib/risk";

export type RouteOption = RoadRoute & {
  id: string;
  risk: number; // worst rain risk anywhere on the route, now + next 6 h (0–100)
  level: RiskLevel;
  fastest: boolean;
  safest: boolean;
};

export type Storm = { mmPerHour: number; hours: number };

const SAMPLE_KM = 25;

// A rain check every ~25 km along the road (Open-Meteo is ~10 km resolution, so finer adds nothing).
function samplePoints(coordinates: number[][]): Point[] {
  const points: Point[] = [{ lat: coordinates[0][1], lon: coordinates[0][0] }];
  let km = 0;
  for (let i = 1; i < coordinates.length; i++) {
    const [lon0, lat0] = coordinates[i - 1];
    const [lon, lat] = coordinates[i];
    km += distanceKm(lat0, lon0, lat, lon);
    if (km >= SAMPLE_KM) {
      points.push({ lat, lon });
      km = 0;
    }
  }
  const [lon, lat] = coordinates[coordinates.length - 1];
  points.push({ lat, lon });
  return points;
}

async function routeRisk(route: RoadRoute, storm: Storm): Promise<number> {
  const rain = await getRain(samplePoints(route.coordinates));
  const series = withSimulatedStorm(rain.mm, rain.nowIndex, storm.mmPerHour, storm.hours);
  return Math.max(...series.map((mm) => segmentScore(mm, rain.nowIndex, 1, 1)));
}

// Up to 3 real road options from A to B that avoid every closed spot, scored by rain risk.
export async function getRouteOptions(from: Point, to: Point, closed: Point[], storm: Storm): Promise<RouteOption[]> {
  "use cache";
  cacheLife("minutes");

  const direct = await roadRoute(from, to, closed);
  if (!direct) return [];

  // The public Valhalla server returns no alternates, so ask again with one third of the
  // direct road closed: that surfaces the real other valleys (Tehri, Pauri, Ukhimath roads).
  const cuts = [1 / 3, 2 / 3].map((f) => {
    const [lon, lat] = direct.coordinates[Math.floor(direct.coordinates.length * f)];
    return { lat, lon };
  });
  const alternates = await Promise.all(cuts.map((cut) => roadRoute(from, to, [...closed, cut]).catch(() => null)));

  const routes: RoadRoute[] = [direct];
  for (const alt of alternates) {
    if (!alt || alt.km > direct.km * 2) continue; // a 2x detour is not a real option
    const duplicate = routes.some((r) => Math.abs(r.km - alt.km) <= r.km * 0.02 && r.roads.join() === alt.roads.join());
    if (!duplicate) routes.push(alt);
  }

  const risks = await Promise.all(routes.map((r) => routeRisk(r, storm)));
  const fastestHours = Math.min(...routes.map((r) => r.hours));
  const lowestRisk = Math.min(...risks);
  // Among the routes with the lowest risk, the quickest one is "safest".
  const safestIndex = routes.reduce(
    (best, r, i) => (risks[i] === lowestRisk && (best < 0 || r.hours < routes[best].hours) ? i : best),
    -1,
  );

  return routes.map((r, i) => ({
    ...r,
    id: `option-${i}`,
    risk: risks[i],
    level: riskLevel(risks[i]),
    fastest: r.hours === fastestHours,
    safest: i === safestIndex,
  }));
}
