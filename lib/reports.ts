"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type ReportKind = "landslide" | "rockfall" | "road_blocked" | "water" | "clear";

export const REPORT_KINDS: Record<ReportKind, { hindi: string; label: string }> = {
  landslide: { hindi: "भूस्खलन", label: "Landslide" },
  rockfall: { hindi: "पत्थर गिर रहे", label: "Rockfall" },
  road_blocked: { hindi: "रास्ता बंद", label: "Road blocked" },
  water: { hindi: "पानी / नाला", label: "Water on road" },
  clear: { hindi: "रास्ता खुला", label: "Road clear" },
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

export function timeAgo(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "abhi";
  if (minutes < 60) return `${minutes} min pehle`;
  return `${Math.round(minutes / 60)} ghante pehle`;
}
