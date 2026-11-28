import slides from "@/data/landslides-uttarakhand.json";
import slopeGrid from "@/data/slope-uttarakhand.json";
import { distanceKm } from "@/lib/geo";

// The two non-rain parts of the risk score, for any road in Uttarakhand (see AGENTS.md):
//   slope_factor   mean hillside slope along the road (data/slope-uttarakhand.json, built from AWS
//                  Terrain Tiles by scripts/build-slope-grid.mjs). 10° or less → 1.0, 35° or more → 2.0.
//   history_factor past slides within 2 km (NASA Global Landslide Catalog, Uttarakhand):
//                  none → 1.0, then +0.4 per slide per 10 km of road, capped at 1.8.
// Both are local data: instant, offline, and no API limit to run into.
export type Terrain = { slopeDeg: number | null; slopeFactor: number; pastSlides: number; historyFactor: number };

const NEAR_KM = 2;
const round2 = (n: number) => Math.round(n * 100) / 100;
const grid = Uint8Array.from(atob(slopeGrid.deg), (c) => c.charCodeAt(0));

// null outside Uttarakhand (the grid only covers the state).
function slopeAt(lon: number, lat: number): number | null {
  const c = Math.floor((lon - slopeGrid.west) / slopeGrid.step);
  const r = Math.floor((lat - slopeGrid.south) / slopeGrid.step);
  if (c < 0 || c >= slopeGrid.cols || r < 0 || r >= slopeGrid.rows) return null;
  return grid[r * slopeGrid.cols + c];
}

function lengthKm(line: number[][]): number {
  let km = 0;
  for (let i = 1; i < line.length; i++) km += distanceKm(line[i - 1][1], line[i - 1][0], line[i][1], line[i][0]);
  return km;
}

function pastSlidesNear(line: number[][]): number {
  const box = line.reduce(
    (b, [lon, lat]) => [Math.min(b[0], lon), Math.min(b[1], lat), Math.max(b[2], lon), Math.max(b[3], lat)],
    [Infinity, Infinity, -Infinity, -Infinity],
  );
  const pad = 0.03; // ~3 km: skip slides far from the road before measuring point by point
  return slides.landslides.filter(
    (s) =>
      s.lon >= box[0] - pad &&
      s.lon <= box[2] + pad &&
      s.lat >= box[1] - pad &&
      s.lat <= box[3] + pad &&
      line.some(([lon, lat]) => distanceKm(s.lat, s.lon, lat, lon) <= NEAR_KM),
  ).length;
}

export function getTerrain(line: number[][]): Terrain {
  const slopes = line.map(([lon, lat]) => slopeAt(lon, lat)).filter((v): v is number => v !== null);
  const slopeDeg = slopes.length ? Math.round((slopes.reduce((a, b) => a + b, 0) / slopes.length) * 10) / 10 : null;
  const pastSlides = pastSlidesNear(line);
  const per10km = (pastSlides * 10) / Math.max(lengthKm(line), 1);
  return {
    slopeDeg,
    slopeFactor: slopeDeg === null ? 1 : round2(1 + Math.min(1, Math.max(0, (slopeDeg - 10) / 25))),
    pastSlides,
    historyFactor: round2(Math.min(1.8, 1 + 0.4 * per10km)),
  };
}
