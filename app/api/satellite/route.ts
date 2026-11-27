import { getSatelliteView } from "@/lib/satellite";

// GET /api/satellite?lat=30.55&lon=79.56 → newest and ~1-month-old Sentinel-2 photo of that spot.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  // Rounded to ~1 km so nearby taps share one cached answer.
  const lat = Math.round(Number(params.get("lat")) * 100) / 100;
  const lon = Math.round(Number(params.get("lon")) * 100) / 100;
  // Only Uttarakhand: this is not a general satellite proxy.
  if (!(lat > 29.5 && lat < 31.5 && lon > 77.5 && lon < 80.5)) {
    return Response.json({ error: "Only places in Uttarakhand" }, { status: 400 });
  }
  try {
    return Response.json(await getSatelliteView(lat, lon));
  } catch {
    return Response.json({ error: "Satellite search is not reachable" }, { status: 502 });
  }
}
