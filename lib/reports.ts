"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { distanceKm } from "@/lib/geo";

export type ReportKind = "landslide" | "rockfall" | "road_blocked" | "water" | "jam" | "clear";

// `fill`/`ring`: full Tailwind class names (Tailwind only finds classes written out in full).
const DANGER = { fill: "bg-danger text-snow", ring: "border-danger", tail: "bg-danger" };
export const REPORT_KINDS: Record<ReportKind, { label: string; fill: string; ring: string; tail: string }> = {
  landslide: { label: "Landslide", ...DANGER },
  rockfall: { label: "Rockfall", ...DANGER },
  road_blocked: { label: "Road blocked", ...DANGER },
  water: { label: "Water on road", ...DANGER },
  jam: { label: "Traffic jam", fill: "bg-orange text-ink", ring: "border-orange", tail: "bg-orange" },
  clear: { label: "Road clear", fill: "bg-teal text-ink", ring: "border-teal", tail: "bg-teal" },
};

export type Report = {
  id: string;
  created_at: string;
  segment_id: string;
  kind: ReportKind;
  note: string | null;
  lat: number;
  lon: number;
  photo_url: string | null;
};

export type NewReport = Omit<Report, "id" | "created_at" | "photo_url"> & { photo: File | null };

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

// Recent reports, kept live: new ones from any phone appear instantly.
export function useReports() {
  const [reports, setReports] = useState<Report[]>([]);

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    const since = new Date(Date.now() - 48 * 3600 * 1000).toISOString();

    client
      .from("reports")
      .select("*")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => setReports((current) => mergeReports(current, data ?? [])));

    const channel = client
      .channel("reports-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "reports" }, (payload) =>
        setReports((current) => mergeReports(current, [payload.new as Report])),
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, []);

  return reports;
}

function mergeReports(current: Report[], incoming: Report[]): Report[] {
  const byId = new Map(current.map((r) => [r.id, r]));
  incoming.forEach((r) => byId.set(r.id, r));
  return [...byId.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function createReport(report: NewReport): Promise<void> {
  if (!supabase) throw new Error("Reports are off: Supabase keys missing in .env.local");

  let photo_url: string | null = null;
  if (report.photo) {
    if (report.photo.size > MAX_PHOTO_BYTES) throw new Error("Photo 5 MB se chhoti honi chahiye");
    const ext = report.photo.name.split(".").pop() || "jpg";
    const path = `${crypto.randomUUID()}.${ext}`;
    const upload = await supabase.storage.from("report-photos").upload(path, report.photo);
    if (upload.error) throw new Error(`Photo upload failed: ${upload.error.message}`);
    photo_url = supabase.storage.from("report-photos").getPublicUrl(path).data.publicUrl;
  }

  const { error } = await supabase.from("reports").insert({
    segment_id: report.segment_id,
    kind: report.kind,
    note: report.note,
    lat: report.lat,
    lon: report.lon,
    photo_url,
  });
  if (error) throw new Error(`Report save failed: ${error.message}`);
}

const BLOCKING: ReportKind[] = ["landslide", "rockfall", "road_blocked"];
const CONFIRM_KM = 1;
const CONFIRM_HOURS = 12;

// A road counts as closed when 2+ drivers report it within 1 km in the last 12 h,
// and nobody has reported it clear since. One report alone could be a mistake or a prank.
export function confirmedBlocks(reports: Report[]): { lat: number; lon: number; segmentId: string; count: number }[] {
  const since = Date.now() - CONFIRM_HOURS * 3600_000;
  const recent = reports.filter((r) => new Date(r.created_at).getTime() > since);
  const blocks: { lat: number; lon: number; segmentId: string; count: number }[] = [];
  for (const r of recent) {
    if (!BLOCKING.includes(r.kind)) continue;
    if (blocks.some((b) => distanceKm(b.lat, b.lon, r.lat, r.lon) < CONFIRM_KM)) continue;
    const nearby = recent.filter((o) => distanceKm(o.lat, o.lon, r.lat, r.lon) < CONFIRM_KM);
    const latestBlock = nearby.filter((o) => BLOCKING.includes(o.kind)).map((o) => o.created_at).sort().pop()!;
    const reopened = nearby.some((o) => o.kind === "clear" && o.created_at > latestBlock);
    const count = nearby.filter((o) => BLOCKING.includes(o.kind)).length;
    if (count >= 2 && !reopened) blocks.push({ lat: r.lat, lon: r.lon, segmentId: r.segment_id, count });
  }
  return blocks;
}

// Jams go stale fast: only reports from the last 2 hours count.
export function recentJams(reports: Report[]): Report[] {
  const since = Date.now() - 2 * 3600_000;
  return reports.filter((r) => r.kind === "jam" && new Date(r.created_at).getTime() > since);
}

export function timeAgo(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  return `${Math.round(minutes / 60)} h ago`;
}
