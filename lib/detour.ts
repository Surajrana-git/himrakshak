import { cacheLife } from "next/cache";
import { roadRoute, type Point } from "@/lib/valhalla";

export type Block = Point;

export type Detour =
  | { found: true; coordinates: number[][]; km: number; hours: number; roads: string[]; normalKm: number; normalHours: number }
  | { found: false; normalKm: number; normalHours: number };

const START = { lat: 30.0869, lon: 78.2676 }; // Rishikesh
const END = { lat: 30.7433, lon: 79.4938 }; // Badrinath

// Same closures → same answer, so cache it and stay well inside the public server's limits.
export async function getDetour(blocks: Block[]): Promise<Detour> {
  "use cache";
  cacheLife("minutes");

  const [normal, detour] = await Promise.all([roadRoute(START, END, []), roadRoute(START, END, blocks)]);
  if (!normal) throw new Error("Valhalla found no normal route");
  if (!detour) return { found: false, normalKm: normal.km, normalHours: normal.hours };
  return { found: true, ...detour, normalKm: normal.km, normalHours: normal.hours };
}
