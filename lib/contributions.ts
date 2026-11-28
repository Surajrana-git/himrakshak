"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { deviceId } from "@/lib/device";
import { distanceKm } from "@/lib/geo";
import { checkPhoto, createReport, OFF_HIGHWAY, type ReportKind } from "@/lib/reports";

export type ContributionKind = "place" | "fix" | "post" | "hazard";

export type Contribution = {
  id: string;
  created_at: string;
  kind: ContributionKind;
  category: string;
  title: string | null;
  details: string | null;
  lat: number;
  lon: number;
  photo_urls: string[];
  visibility: "public" | "community";
  device_id: string | null;
  status?: Status; // missing until supabase/run-final-2.sql has been run
  ai_reason?: string | null;
};

export type Status = "approved" | "pending" | "rejected";

export type NewContribution = Omit<Contribution, "id" | "created_at" | "photo_urls" | "device_id" | "status" | "ai_reason"> & { photos: File[] };

// Posts about the road itself also go in as a road report, so they colour the risk map and can close a road.
const ROAD_KIND: Record<string, ReportKind> = {
  Landslide: "landslide",
  "Blocked Road": "road_blocked",
  "Closed / Blocked Road": "road_blocked",
  Traffic: "jam",
  Rockfall: "rockfall",
  "Water on road": "water",
};

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

// Saves a contribution with its Geo Cam photos and its approval:
//   every photo passes the AI check → approved (on the map with its photo);
//   any photo is a screenshot / screen / gallery shot → rejected (kept, but never on the map);
//   no photo or the AI could not check → pending (approved once a second phone posts the same nearby).
export async function addContribution(c: NewContribution): Promise<{ status: Status; reason: string | null }> {
  if (!supabase) throw new Error("The server is not configured");
  const client = supabase;
  if (c.photos.some((p) => p.size > MAX_PHOTO_BYTES)) throw new Error("Each photo must be under 5 MB");
  // All photos upload and get their AI check at the same time, not one after another.
  const checked = await Promise.all(
    c.photos.map(async (photo) => {
      const path = `${crypto.randomUUID()}.jpg`;
      const upload = await client.storage.from("report-photos").upload(path, photo, { contentType: "image/jpeg" });
      if (upload.error) throw new Error(`Photo upload failed: ${upload.error.message}`);
      const url = client.storage.from("report-photos").getPublicUrl(path).data.publicUrl;
      return { url, ai: await checkPhoto(url) };
    }),
  );
  const photo_urls = checked.map((p) => p.url);
  const fake = checked.find((p) => p.ai?.verdict === "fake");
  const status: Status = fake ? "rejected" : !checked.length || checked.some((p) => !p.ai) ? "pending" : "approved";
  const reason = fake?.ai?.reason ?? null;
  const row = { kind: c.kind, category: c.category, title: c.title, details: c.details, lat: c.lat, lon: c.lon, photo_urls, visibility: c.visibility, device_id: deviceId() };
  let { error } = await supabase.from("contributions").insert({ ...row, status, ai_reason: reason?.slice(0, 200) ?? null });
  // Before supabase/run-final-2.sql there is no status column: a rejected post is not saved at all.
  if (error && /status|ai_reason/.test(error.message)) {
    if (status === "rejected") return { status, reason };
    ({ error } = await supabase.from("contributions").insert(row));
  }
  if (error) {
    if (/contributions/.test(error.message)) throw new Error("Saving is not set up yet: run supabase/run-final.sql in Supabase.");
    throw new Error(`Could not save: ${error.message}`);
  }
  const kind = ROAD_KIND[c.category];
  if (kind && status !== "rejected") await createReport({ segment_id: OFF_HIGHWAY, kind, note: c.details, lat: c.lat, lon: c.lon, photo: null }).catch(() => {});
  return { status, reason };
}

// The status a post shows: a pending one counts as approved once another phone posted the
// same category within 1 km and 12 hours (the same rule that closes a road).
export function approval(c: Contribution, all: Contribution[]): Status {
  const status = c.status ?? (c.photo_urls.length ? "approved" : "pending");
  if (status !== "pending") return status;
  const confirmed = all.some(
    (o) =>
      o.id !== c.id &&
      o.device_id !== c.device_id &&
      o.category === c.category &&
      (o.status ?? "approved") !== "rejected" &&
      distanceKm(o.lat, o.lon, c.lat, c.lon) < 1 &&
      Math.abs(new Date(o.created_at).getTime() - new Date(c.created_at).getTime()) < 12 * 3600_000,
  );
  return confirmed ? "approved" : "pending";
}

export const STATUS_LABEL: Record<Status, string> = { approved: "Approved", pending: "Waiting for approval", rejected: "Not approved" };

// Everything travellers posted, newest first, live.
export function useContributions(): { items: Contribution[]; error: string | null } {
  const [items, setItems] = useState<Contribution[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    client
      .from("contributions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        setError(error ? "Posted events are not set up yet (run supabase/run-final.sql)." : null);
        setItems((data as Contribution[]) ?? []);
      });
    const channel = client
      // One channel per screen using this hook: a shared name crashes Supabase when a second screen subscribes.
      .channel(`contributions-live-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "contributions" }, (p) => setItems((cur) => [p.new as Contribution, ...cur]))
      .subscribe();
    return () => {
      client.removeChannel(channel);
    };
  }, []);
  return { items, error };
}
