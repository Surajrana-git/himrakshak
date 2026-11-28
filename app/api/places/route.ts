import { searchPlaces } from "@/lib/geocode";

// GET /api/places?q=mussoorie → places in Uttarakhand matching the name.
export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().toLowerCase().slice(0, 60);
  if (q.length < 2) return Response.json({ places: [] });
  return Response.json({ places: await searchPlaces(q) });
}
