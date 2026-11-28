import { supabase } from "@/lib/supabase";
import { parsePacket } from "@/lib/sos-packet";
import { pushToAll } from "@/lib/push";

const HAZARD_WORDS: Record<string, string> = { STUCK: "Vehicle stuck", INJURED: "Injured", TRAPPED: "Trapped by a road block", SLIDE: "Saw a landslide", OTHER: "Needs help" };

// Saves one SOS packet for the rescue dashboard. A copy that already arrived another way
// (same packet id) is ignored, so a storm of relays makes one pin.
export async function saveSosPacket(text: string, via: "app" | "sms" | "mesh"): Promise<{ ok: boolean; status: number; message: string }> {
  const p = parsePacket(text);
  if (!p) return { ok: false, status: 400, message: "Not an SOS packet" };
  if (!supabase) return { ok: false, status: 503, message: "Server not configured" };
  const message = `${HAZARD_WORDS[p.hazard]} · via ${via}`;
  const { error } = await supabase.from("sos").insert({ lat: p.lat, lon: p.lon, accuracy_m: null, message, packet_id: p.id, via, hazard: p.hazard });
  if (!error) {
    // Every Himrakshak phone hears about it: someone nearby may reach them first.
    await pushToAll("SOS: someone needs help", `${HAZARD_WORDS[p.hazard]} at ${p.lat.toFixed(4)}, ${p.lon.toFixed(4)}. Open Himrakshak to see where.`, "/dashboard").catch(() => 0);
    return { ok: true, status: 200, message: "saved" };
  }
  if (error.code === "23505") return { ok: true, status: 200, message: "already saved" };
  // Before supabase/run-final-3.sql: no packet_id column, so save the plain SOS.
  if (/packet_id|via|hazard/.test(error.message)) {
    const plain = await supabase.from("sos").insert({ lat: p.lat, lon: p.lon, accuracy_m: null, message });
    return plain.error ? { ok: false, status: 502, message: plain.error.message } : { ok: true, status: 200, message: "saved" };
  }
  return { ok: false, status: 502, message: error.message };
}
