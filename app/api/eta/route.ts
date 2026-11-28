import { roadRoute, type Costing } from "@/lib/valhalla";
import { inUttarakhand } from "@/lib/area";

const MODES: Costing[] = ["auto", "motorcycle", "pedestrian"];

function point(text: string | null) {
  const [lat, lon] = (text ?? "").split(",").map(Number);
  return Number.isFinite(lat) && Number.isFinite(lon) && inUttarakhand(lat, lon) ? { lat, lon } : null;
}

// GET /api/eta?from=lat,lon&to=lat,lon → time and distance by car, bike and on foot (for the tabs).
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const from = point(params.get("from"));
  const to = point(params.get("to"));
  if (!from || !to) return Response.json({ error: "from and to must be inside Uttarakhand" }, { status: 400 });
  const results = await Promise.all(MODES.map((m) => roadRoute(from, to, [], m).catch(() => null)));
  return Response.json(Object.fromEntries(MODES.map((m, i) => [m, results[i] ? { km: results[i]!.km, hours: results[i]!.hours } : null])));
}
