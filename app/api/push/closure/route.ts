import { supabase } from "@/lib/supabase";
import { distanceKm } from "@/lib/geo";
import { pushToAll } from "@/lib/push";

const BLOCKING = ["landslide", "rockfall", "road_blocked"];

// POST { lat, lon } after a block report. The server checks the reports itself: the alert goes out
// only at the moment a second phone confirms a block within 1 km and 12 h (the road-closure rule).
export async function POST(request: Request) {
  const { lat, lon } = (await request.json().catch(() => ({}))) as { lat?: number; lon?: number };
  if (typeof lat !== "number" || typeof lon !== "number" || !supabase) return Response.json({ sent: 0 }, { status: 400 });
  const since = new Date(Date.now() - 12 * 3600_000).toISOString();
  const { data } = await supabase.from("reports").select("lat, lon, kind, device_id, id").gte("created_at", since).in("kind", BLOCKING).limit(1000);
  const near = (data ?? []).filter((r) => distanceKm(r.lat, r.lon, lat, lon) < 1);
  const phones = new Set(near.map((r) => r.device_id ?? r.id)).size;
  if (phones !== 2) return Response.json({ sent: 0, phones });
  const sent = await pushToAll("Road closed ahead", `Two drivers report the road blocked at ${lat.toFixed(4)}, ${lon.toFixed(4)}. Open Himrakshak for a safer route.`);
  return Response.json({ sent, phones });
}
