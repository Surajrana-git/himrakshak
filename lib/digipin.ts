// DIGIPIN: India Post's open 10-character address grid (github.com/INDIAPOST-gov/digipin).
// Each character picks one cell of a 4×4 grid, so every level is 4× finer; 10 levels ≈ 4 m.
const GRID = [
  ["F", "C", "9", "8"],
  ["J", "3", "2", "7"],
  ["K", "4", "5", "6"],
  ["L", "M", "P", "T"],
];

export function digipin(lat: number, lon: number): string | null {
  let minLat = 2.5;
  let maxLat = 38.5;
  let minLon = 63.5;
  let maxLon = 99.5;
  if (lat < minLat || lat > maxLat || lon < minLon || lon > maxLon) return null;
  let code = "";
  for (let level = 1; level <= 10; level++) {
    const latStep = (maxLat - minLat) / 4;
    const lonStep = (maxLon - minLon) / 4;
    const row = Math.min(3, Math.max(0, 3 - Math.floor((lat - minLat) / latStep)));
    const col = Math.min(3, Math.max(0, Math.floor((lon - minLon) / lonStep)));
    code += GRID[row][col];
    if (level === 3 || level === 6) code += "-";
    maxLat = minLat + latStep * (4 - row);
    minLat = minLat + latStep * (3 - row);
    minLon = minLon + lonStep * col;
    maxLon = minLon + lonStep;
  }
  return code;
}
