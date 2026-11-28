import { saveSosPacket } from "@/lib/sos-intake";

// POST { packet: "HIM|…", via: "mesh" | "app" } from a phone that has internet: its own SOS,
// or one it picked up from another phone over Bluetooth (the mesh gateway).
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { packet?: string; via?: string };
  const result = await saveSosPacket(String(body.packet ?? "").slice(0, 200), body.via === "app" ? "app" : "mesh");
  return Response.json({ message: result.message }, { status: result.status });
}
