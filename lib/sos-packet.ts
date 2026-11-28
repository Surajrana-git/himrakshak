// The compact SOS packet shared by the app, SMS and the Bluetooth mesh (Android: SosPacket.java).
//   HIM|<id>|<lat>,<lon>|<hazard>|<unix seconds>|<ttl>      e.g. HIM|k3j9a2|30.35800,77.84940|STUCK|1795849329|5
// About 55 characters: one SMS. The same id on every copy means the rescue room saves it once.

export const HAZARDS = ["OTHER", "STUCK", "INJURED", "TRAPPED", "SLIDE"] as const;
export type Hazard = (typeof HAZARDS)[number];
export type SosPacket = { id: string; lat: number; lon: number; hazard: Hazard; ts: number; ttl: number };

export const MESH_TTL = 6; // at most 6 phones pass it on

export function newPacketId(): string {
  // 6 base-36 characters, below 2^32 so the Bluetooth form can carry it in 4 bytes.
  return Math.floor(Math.random() * 36 ** 6).toString(36).padStart(6, "0");
}

export function toText(p: SosPacket): string {
  return `HIM|${p.id}|${p.lat.toFixed(5)},${p.lon.toFixed(5)}|${p.hazard}|${p.ts}|${p.ttl}`;
}

// Null for anything that is not a valid packet (a normal SMS, a broken copy).
export function parsePacket(text: string): SosPacket | null {
  const start = text.indexOf("HIM|");
  if (start < 0) return null;
  const parts = text.slice(start).trim().split("|");
  if (parts.length < 6) return null;
  const [, id, ll, hazard, ts, ttl] = parts;
  const [lat, lon] = ll.split(",").map(Number);
  const p = { id, lat, lon, hazard: (HAZARDS as readonly string[]).includes(hazard) ? (hazard as Hazard) : "OTHER", ts: Number(ts), ttl: parseInt(ttl, 10) };
  const ok = /^[0-9a-z]{6}$/.test(id) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 && Number.isFinite(p.ts) && p.ttl >= 0 && p.ttl <= 15;
  return ok ? p : null;
}

// SOS screen reasons → hazard codes.
export const REASON_HAZARD: Record<string, Hazard> = {
  "Vehicle stuck": "STUCK",
  Injured: "INJURED",
  "Trapped by a road block": "TRAPPED",
  "Saw a landslide": "SLIDE",
};
