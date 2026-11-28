import { getRouteOptions } from "@/lib/routes";
import { COSTINGS, type Costing, type Point } from "@/lib/valhalla";
import { inUttarakhand } from "@/lib/area";

// Only Uttarakhand: this is not a general routing proxy.
const inArea = ({ lat, lon }: Point) => inUttarakhand(lat, lon);

function parsePoint(text: string | null): Point | null {
  const [lat, lon] = (text ?? "").split(",").map(Number);
  // Rounded to ~100 m so nearby requests share one cached answer.
  const point = { lat: Math.round(lat * 1000) / 1000, lon: Math.round(lon * 1000) / 1000 };
  return Number.isFinite(lat) && Number.isFinite(lon) && inArea(point) ? point : null;
}

// GET /api/routes?from=lat,lon&to=lat,lon&closed=lat,lon;lat,lon&storm=mmPerHour,hours&mode=auto|bus|motorcycle|pedestrian
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const from = parsePoint(params.get("from"));
  const to = parsePoint(params.get("to"));
  if (!from || !to) return Response.json({ error: "from and to must be lat,lon inside Uttarakhand" }, { status: 400 });

  const closed = (params.get("closed") ?? "")
    .split(";")
    .slice(0, 5)
    .map(parsePoint)
    .filter((p): p is Point => p !== null);
  const [mmPerHour, hours] = (params.get("storm") ?? "0,3").split(",").map(Number);
  const storm = { mmPerHour: Math.min(20, Math.max(0, mmPerHour || 0)), hours: Math.min(8, Math.max(1, hours || 3)) };

  try {
    const mode = params.get("mode") as Costing | null;
    const costing = mode && COSTINGS.includes(mode) ? mode : "auto";
    return Response.json({ options: await getRouteOptions(from, to, closed, storm, costing) });
  } catch (e) {
    console.error("route options failed:", e);
    return Response.json({ error: "Routing or weather server is not reachable" }, { status: 502 });
  }
}
