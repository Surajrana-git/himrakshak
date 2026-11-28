"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { deviceId } from "@/lib/device";
import { distanceKm } from "@/lib/geo";
import type { Report } from "@/lib/reports";

// Road Rewards v1, worked out from the reports themselves (no extra table):
//   10 points for every report, 20 more when a driver on another phone reports the same spot
//   (within 1 km and 12 h) — so a true report is worth more than a fake one.
export type Rewards = { points: number; reports: number; confirmed: number; level: string; next: number | null };

const LEVELS = [
  { from: 0, name: "New reporter" },
  { from: 50, name: "Road Guardian" },
  { from: 200, name: "Himrakshak Hero" },
];

type Row = Pick<Report, "id" | "created_at" | "lat" | "lon" | "kind"> & { device_id: string | null };

export function useRewards(): Rewards | null {
  const [rewards, setRewards] = useState<Rewards | null>(null);

  useEffect(() => {
    const me = deviceId();
    if (!supabase || !me) return;
    let stale = false;
    const since = new Date(Date.now() - 90 * 86400_000).toISOString();
    supabase
      .from("reports")
      .select("id, created_at, lat, lon, kind, device_id")
      .gte("created_at", since)
      .limit(2000)
      .then(({ data, error }) => {
        // Before supabase/run-28nov.sql there is no device_id column: no rewards to show yet.
        if (stale || error || !data) return;
        const rows = data as Row[];
        const mine = rows.filter((r) => r.device_id === me);
        const confirmed = mine.filter((r) =>
          rows.some(
            (o) =>
              o.device_id !== me &&
              distanceKm(o.lat, o.lon, r.lat, r.lon) < 1 &&
              Math.abs(new Date(o.created_at).getTime() - new Date(r.created_at).getTime()) < 12 * 3600_000,
          ),
        ).length;
        const points = mine.length * 10 + confirmed * 20;
        const level = [...LEVELS].reverse().find((l) => points >= l.from)!;
        const next = LEVELS.find((l) => l.from > points)?.from ?? null;
        setRewards({ points, reports: mine.length, confirmed, level: level.name, next });
      });
    return () => {
      stale = true;
    };
  }, []);

  return rewards;
}
