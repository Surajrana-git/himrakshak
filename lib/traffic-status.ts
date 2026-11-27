import type { SegmentFlow } from "@/lib/traffic";
import type { Report } from "@/lib/reports";

export type TrafficLevel = "clear" | "slow" | "jam" | "closed" | "unknown";

// Same colours as risk, so the map stays one visual language; words say which layer it is.
export const TRAFFIC_STYLE: Record<TrafficLevel, { color: string; text: string; label: string }> = {
  clear: { color: "#5FB3A1", text: "#14231F", label: "Clear" },
  slow: { color: "#F08A3E", text: "#14231F", label: "Slow" },
  jam: { color: "#B03030", text: "#F3F1EA", label: "Jam" },
  closed: { color: "#14231F", text: "#F3F1EA", label: "Closed" },
  unknown: { color: "#4B5A55", text: "#F3F1EA", label: "No data" },
};

const DRIVER_HOURS = 2;

// Order of trust: road closed > a driver on the spot in the last 2 h > TomTom live speed.
export function trafficLevel(segmentId: string, closed: boolean, flow: SegmentFlow | null, reports: Report[]): TrafficLevel {
  if (closed || flow?.closed) return "closed";
  const since = Date.now() - DRIVER_HOURS * 3600_000;
  const latest = reports.find(
    (r) => r.segment_id === segmentId && (r.kind === "jam" || r.kind === "clear") && new Date(r.created_at).getTime() > since,
  );
  if (latest) return latest.kind === "jam" ? "jam" : "clear";
  if (!flow || flow.freeFlowKmh === 0) return "unknown";
  const ratio = flow.currentKmh / flow.freeFlowKmh;
  if (ratio < 0.5) return "jam";
  if (ratio < 0.8) return "slow";
  return "clear";
}
