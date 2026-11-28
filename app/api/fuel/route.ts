import { fuelAlong } from "@/lib/fuel";

// POST { coordinates: [[lon, lat], …] } → petrol and CNG pumps near that road.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { coordinates?: number[][] };
  const line = (body.coordinates ?? []).filter((p) => Array.isArray(p) && p.length >= 2).slice(0, 4000);
  if (line.length < 2) return Response.json({ stops: [] }, { status: 400 });
  return Response.json({ stops: await fuelAlong(line) });
}
