import { getDetour, type Block } from "@/lib/detour";

// GET /api/reroute?blocks=30.2412,78.9006;30.69,79.51
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("blocks") ?? "";
  const blocks: Block[] = raw
    .split(";")
    .filter(Boolean)
    .slice(0, 5)
    .map((pair) => {
      const [lat, lon] = pair.split(",").map(Number);
      // Rounded to ~100 m so nearby reports share one cached answer.
      return { lat: Math.round(lat * 1000) / 1000, lon: Math.round(lon * 1000) / 1000 };
    })
    // Only Uttarakhand: this is not a general routing proxy.
    .filter(({ lat, lon }) => lat > 29.5 && lat < 31.5 && lon > 77.5 && lon < 80.5);
  if (blocks.length === 0) return Response.json({ error: "No valid blocks" }, { status: 400 });

  try {
    return Response.json(await getDetour(blocks));
  } catch {
    return Response.json({ error: "Routing server is not reachable" }, { status: 502 });
  }
}
