import { placeAt, searchPlaces } from "@/lib/geocode";

// GET /api/places?q=mussoorie → places in Uttarakhand matching the name.
// GET /api/places?lat=30.358&lon=77.849 → the place name at that point (Geo Cam stamp).
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const lat = Number(params.get("lat"));
  const lon = Number(params.get("lon"));
  if (params.has("lat") && Number.isFinite(lat) && Number.isFinite(lon)) {
    // ~100 m grid, so nearby shots share one cached lookup.
    return Response.json({ place: await placeAt(Number(lat.toFixed(3)), Number(lon.toFixed(3))) });
  }
  const q = (params.get("q") ?? "").trim().toLowerCase().slice(0, 60);
  if (q.length < 2) return Response.json({ places: [] });
  return Response.json({ places: await searchPlaces(q) });
}
