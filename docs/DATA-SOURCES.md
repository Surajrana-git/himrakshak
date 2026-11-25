# Data sources

All free. Check each link still works before relying on it.

| Need | Source | Notes |
|---|---|---|
| Rain now + forecast | Open-Meteo — https://open-meteo.com/en/docs | No key. Hourly `precipitation` per lat/lon. |
| Roads | OpenStreetMap via Geofabrik India extract, or Overpass API | NH-7 (Rishikesh–Badrinath), NH-107 (Rudraprayag–Gaurikund) |
| Map tiles | MapLibre GL JS + free OSM-based style | Respect tile usage limits |
| Past landslides | NASA Global Landslide Catalog — https://data.nasa.gov/dataset/global-landslide-catalog-export | **Used.** `node scripts/build-landslides.mjs <csv>` keeps events within 2 km of the route with location accuracy ≤10 km → `data/landslides-badrinath.json` (29 events, 2007–2017) |
| Landslide zones | GSI Bhukosh — https://bhukosh.gsi.gov.in | Landslide inventory layer |
| Slope / elevation | SRTM or Copernicus DEM (30 m) | Pre-compute slope per road segment into `data/` |
| Glacial lakes | Sentinel-2 via Copernicus Browser — https://browser.dataspace.copernicus.eu | Pick 2–3 lakes, compare 2–3 dates |
| Active fires (optional) | NASA FIRMS | Free key |
| Hindi translation / voice | AI4Bharat IndicTrans2, Indic TTS | Open source |
| Photo check (is the road really blocked?) | Gemini API free tier — https://aistudio.google.com | Free key, rate-limited; check current limits. Backup: 2 other drivers confirm the report (no AI, ₹0) |

## News figures used in the pitch (July 2026)

- 149 roads blocked by landslides (Free Press Journal)
- Char Dham Yatra suspended repeatedly (NewsOnAir, NewKerala)
- 45,23,412 pilgrims by 25 July 2026 (news reports)
