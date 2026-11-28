"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { deviceId } from "@/lib/device";
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
};

export type NewContribution = Omit<Contribution, "id" | "created_at" | "photo_urls" | "device_id"> & { photos: File[] };

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

// Saves a contribution with its Geo Cam photos. Every photo goes through the AI check first;
// one that is not a live Geo Cam shot stops the whole post.
export async function addContribution(c: NewContribution): Promise<void> {
  if (!supabase) throw new Error("The server is not configured");
  const photo_urls: string[] = [];
  for (const photo of c.photos) {
    if (photo.size > MAX_PHOTO_BYTES) throw new Error("Each photo must be under 5 MB");
    const path = `${crypto.randomUUID()}.jpg`;
    const upload = await supabase.storage.from("report-photos").upload(path, photo, { contentType: "image/jpeg" });
    if (upload.error) throw new Error(`Photo upload failed: ${upload.error.message}`);
    const url = supabase.storage.from("report-photos").getPublicUrl(path).data.publicUrl;
    const ai = await checkPhoto(url);
    if (ai?.verdict === "fake") throw new Error(`Photo rejected by the AI check: ${ai.reason}`);
    photo_urls.push(url);
  }
  const { error } = await supabase.from("contributions").insert({
    kind: c.kind,
    category: c.category,
    title: c.title,
    details: c.details,
    lat: c.lat,
    lon: c.lon,
    photo_urls,
    visibility: c.visibility,
    device_id: deviceId(),
  });
  if (error) {
    if (/contributions/.test(error.message)) throw new Error("Saving is not set up yet: run supabase/run-final.sql in Supabase.");
    throw new Error(`Could not save: ${error.message}`);
  }
  const kind = ROAD_KIND[c.category];
  if (kind) await createReport({ segment_id: OFF_HIGHWAY, kind, note: c.details, lat: c.lat, lon: c.lon, photo: null }).catch(() => {});
}

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
      .channel("contributions-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "contributions" }, (p) => setItems((cur) => [p.new as Contribution, ...cur]))
      .subscribe();
    return () => {
      client.removeChannel(channel);
    };
  }, []);
  return { items, error };
}
