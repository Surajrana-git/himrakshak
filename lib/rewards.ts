"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { deviceId } from "@/lib/device";
import { distanceKm } from "@/lib/geo";
import { REPORT_KINDS, type Report } from "@/lib/reports";
import type { Contribution } from "@/lib/contributions";

// Road Rewards, worked out from what this phone sent (1 point = ₹1):
//   a road report: 10 points, waiting for approval until a driver on another phone reports the same
//     spot (within 1 km and 12 h); then approved with 20 more. A true report is worth more than a fake one.
//   a post, place, map fix or hazard (photos already passed the AI check): 10 points, +10 with a photo.
export type Activity = {
  id: string;
  at: string;
  title: string;
  group: "Hazard Report" | "Weather Update" | "Location Share" | "Map Update";
  status: "Approved" | "Pending";
  points: number;
  photo: string | null;
};

export type Rewards = { points: number; pending: number; photos: number; level: string; next: number | null; reports: number; confirmed: number; activities: Activity[] };

const LEVELS = [
  { from: 0, name: "New reporter" },
  { from: 50, name: "Road Guardian" },
  { from: 200, name: "Himrakshak Hero" },
];

type Row = Pick<Report, "id" | "created_at" | "lat" | "lon" | "kind" | "photo_url"> & { device_id: string | null };

export function useRewards(): Rewards | null {
  const [rewards, setRewards] = useState<Rewards | null>(null);

  useEffect(() => {
    const me = deviceId();
    if (!supabase || !me) return;
    const client = supabase;
    let stale = false;
    const since = new Date(Date.now() - 90 * 86400_000).toISOString();
    Promise.all([
      client.from("reports").select("id, created_at, lat, lon, kind, photo_url, device_id").gte("created_at", since).limit(2000),
      client.from("contributions").select("*").eq("device_id", me).limit(500),
    ]).then(([reports, posts]) => {
      if (stale || reports.error || !reports.data) return;
      const rows = reports.data as Row[];
      const activities: Activity[] = rows
        .filter((r) => r.device_id === me)
        .map((r) => {
          const confirmed = rows.some(
            (o) => o.device_id !== me && distanceKm(o.lat, o.lon, r.lat, r.lon) < 1 && Math.abs(new Date(o.created_at).getTime() - new Date(r.created_at).getTime()) < 12 * 3600_000,
          );
          return {
            id: r.id,
            at: r.created_at,
            title: `Reported ${REPORT_KINDS[r.kind].label.toLowerCase()}`,
            group: "Hazard Report",
            status: confirmed ? "Approved" : "Pending",
            points: confirmed ? 30 : 10,
            photo: r.photo_url,
          };
        });
      for (const c of (posts.data as Contribution[] | null) ?? []) {
        activities.push({
          id: c.id,
          at: c.created_at,
          title: c.kind === "place" ? `Added a place: ${c.title}` : c.kind === "fix" ? `Fixed the map: ${c.category}` : `Shared ${c.category.toLowerCase()}`,
          group: c.category === "Weather" ? "Weather Update" : c.kind === "place" || c.kind === "fix" ? "Location Share" : c.kind === "hazard" ? "Hazard Report" : "Map Update",
          status: "Approved",
          points: c.photo_urls.length ? 20 : 10,
          photo: c.photo_urls[0] ?? null,
        });
      }
      activities.sort((a, b) => b.at.localeCompare(a.at));
      const points = activities.filter((a) => a.status === "Approved").reduce((n, a) => n + a.points, 0);
      const pending = activities.filter((a) => a.status === "Pending").reduce((n, a) => n + a.points, 0);
      const level = [...LEVELS].reverse().find((l) => points >= l.from)!;
      const mine = activities.filter((a) => a.group === "Hazard Report" && rows.some((r) => r.id === a.id));
      setRewards({
        points,
        pending,
        photos: rows.filter((r) => r.device_id === me && r.photo_url).length + ((posts.data as Contribution[] | null) ?? []).reduce((n, c) => n + c.photo_urls.length, 0),
        level: level.name,
        next: LEVELS.find((l) => l.from > points)?.from ?? null,
        reports: mine.length,
        confirmed: mine.filter((a) => a.status === "Approved").length,
        activities,
      });
    });
    return () => {
      stale = true;
    };
  }, []);

  return rewards;
}
