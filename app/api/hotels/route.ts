import { hotelsNear } from "@/lib/geocode";
import { inUttarakhand } from "@/lib/area";

// GET /api/hotels?lat=30.36&lon=77.85 → places to stay nearby (Uttarakhand only).
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const lat = Number(params.get("lat"));
  const lon = Number(params.get("lon"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !inUttarakhand(lat, lon)) return Response.json({ hotels: [] });
  return Response.json({ hotels: await hotelsNear(Number(lat.toFixed(2)), Number(lon.toFixed(2))) });
}
