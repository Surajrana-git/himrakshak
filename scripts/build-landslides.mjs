// Builds data/landslides-badrinath.json: past landslides from NASA's Global Landslide
// Catalog (2007–2017) that happened within 2 km of our route.
// Download the CSV first (free, ~8 MB):
//   https://data.nasa.gov/docs/legacy/Global_Landslide_Catalog_Export/Global_Landslide_Catalog_Export_rows.csv
// Run: node scripts/build-landslides.mjs path/to/Global_Landslide_Catalog_Export_rows.csv
import { readFileSync, writeFileSync } from "node:fs";

const MAX_KM = 2;
// Many entries are only placed to the nearest town; a pin 25–50 km off would mislead drivers.
const PRECISE_ENOUGH = ["exact", "1km", "5km", "10km"];
const route = JSON.parse(readFileSync("data/route-badrinath.json", "utf8"));
const routePoints = route.segments.flatMap((s) => s.coordinates.map(([lon, lat]) => ({ lat, lon, segmentId: s.id })));

// Quoted fields can hold commas and newlines, so a split(",") is not enough.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function distanceKm(aLat, aLon, bLat, bLon) {
  const rad = Math.PI / 180;
  const dLat = (bLat - aLat) * rad;
  const dLon = (bLon - aLon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

const [header, ...rows] = parseCsv(readFileSync(process.argv[2], "utf8"));
const col = (name) => header.indexOf(name);

// The CSV uses US dates: "09/19/2010 10:00:00 PM".
function isoDate(usDate) {
  const [m, d, y] = usDate.slice(0, 10).split("/");
  return `${y}-${m}-${d}`;
}

const landslides = [];
for (const r of rows) {
  const lat = Number(r[col("latitude")]);
  const lon = Number(r[col("longitude")]);
  if (!PRECISE_ENOUGH.includes(r[col("location_accuracy")])) continue;
  if (!lat || !lon || lat < 29.8 || lat > 31 || lon < 78 || lon > 79.8) continue;
  let best = { km: Infinity, segmentId: "" };
  for (const p of routePoints) {
    const km = distanceKm(lat, lon, p.lat, p.lon);
    if (km < best.km) best = { km, segmentId: p.segmentId };
  }
  if (best.km > MAX_KM) continue;
  landslides.push({
    id: r[col("event_id")],
    date: isoDate(r[col("event_date")]),
    title: r[col("event_title")],
    place: r[col("location_description")],
    accuracy: r[col("location_accuracy")],
    trigger: r[col("landslide_trigger")],
    size: r[col("landslide_size")],
    deaths: Number(r[col("fatality_count")]) || 0,
    lat,
    lon,
    segmentId: best.segmentId,
    kmFromRoad: Math.round(best.km * 10) / 10,
  });
}
landslides.sort((a, b) => b.date.localeCompare(a.date));

writeFileSync(
  "data/landslides-badrinath.json",
  JSON.stringify(
    {
      source: "NASA Global Landslide Catalog (Kirschbaum et al. 2015), events 2007–2017",
      sourceUrl: "https://data.nasa.gov/dataset/global-landslide-catalog-export",
      maxKmFromRoad: MAX_KM,
      landslides,
    },
    null,
    1,
  ) + "\n",
);
console.log(`${landslides.length} landslides within ${MAX_KM} km of the route`);
