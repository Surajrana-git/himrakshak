// Fetch real road geometry for Rishikesh -> Badrinath (NH-7) from the public OSRM
// demo server and write it as segments between towns. Run once; output is static data.
import { writeFileSync } from "node:fs";

const TOWNS = [
  ["Rishikesh", 30.0869, 78.2676],
  ["Devprayag", 30.146, 78.598],
  ["Srinagar", 30.2232, 78.7806],
  ["Rudraprayag", 30.2844, 78.9811],
  ["Gauchar", 30.289, 79.155],
  ["Karnaprayag", 30.2617, 79.2187],
  ["Chamoli", 30.401, 79.329],
  ["Pipalkoti", 30.428, 79.43],
  ["Joshimath", 30.555, 79.565],
  ["Badrinath", 30.7433, 79.4938],
];

const round = (n) => Math.round(n * 1e5) / 1e5;
const segments = [];

for (let i = 0; i < TOWNS.length - 1; i++) {
  const [a, alat, alon] = TOWNS[i];
  const [b, blat, blon] = TOWNS[i + 1];
  const url = `https://router.project-osrm.org/route/v1/driving/${alon},${alat};${blon},${blat}?overview=full&geometries=geojson`;
  const data = await (await fetch(url)).json();
  const route = data.routes[0];
  const all = route.geometry.coordinates.map(([x, y]) => [round(x), round(y)]);
  const coords = all.filter((_, j) => j % 3 === 0);
  coords.push(all[all.length - 1]);
  const mid = coords[Math.floor(coords.length / 2)];
  segments.push({
    id: `${a.toLowerCase()}-${b.toLowerCase()}`,
    from: a,
    to: b,
    distanceKm: Math.round(route.distance / 100) / 10,
    rainPoint: { lat: mid[1], lon: mid[0] },
    slopeFactor: 1.0,
    historyFactor: 1.0,
    coordinates: coords,
  });
  console.log(a, "->", b, segments.at(-1).distanceKm, "km", coords.length, "pts");
  await new Promise((r) => setTimeout(r, 1000));
}

writeFileSync(
  process.argv[2],
  JSON.stringify({
    name: "Rishikesh to Badrinath (NH-7)",
    source: "Road geometry: OpenStreetMap via OSRM (router.project-osrm.org).",
    note: "slopeFactor and historyFactor are 1.0 until computed from DEM slope and NASA/GSI landslide data.",
    towns: TOWNS.map(([name, lat, lon]) => ({ name, lat, lon })),
    segments,
  }),
);
