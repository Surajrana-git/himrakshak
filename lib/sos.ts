"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { googlePlaceUrl } from "@/lib/google-maps";

export type SosCall = {
  id: string;
  created_at: string;
  lat: number;
  lon: number;
  accuracy_m: number | null;
  message: string | null;
};

export type GpsFix = { lat: number; lon: number; accuracy: number };

export function getGpsFix(): Promise<GpsFix> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) return reject(new Error("This phone has no GPS"));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: Math.round(pos.coords.accuracy) }),
      () => reject(new Error("Could not get your location. Turn on GPS or move to an open area.")),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  });
}

// Online path: saved to Supabase, the rescue dashboard sees it instantly.
export async function sendSos(fix: GpsFix, message: string | null): Promise<void> {
  if (!supabase) throw new Error("The SOS server is not configured (Supabase keys)");
  if (!navigator.onLine) throw new Error("No internet");
  const { error } = await supabase.from("sos").insert({ lat: fix.lat, lon: fix.lon, accuracy_m: fix.accuracy, message });
  if (error) throw new Error(`SOS was not saved: ${error.message}`);
}

// Offline path: the text a person or a rescue room can act on without our app.
export function sosText(fix: GpsFix, message: string | null): string {
  const lat = fix.lat.toFixed(5);
  const lon = fix.lon.toFixed(5);
  return [
    "SOS Himrakshak: I need help.",
    message,
    `Location: ${lat},${lon} (±${fix.accuracy} m)`,
    googlePlaceUrl(fix.lat, fix.lon),
  ]
    .filter(Boolean)
    .join("\n");
}

// Last 24 h of SOS calls, kept live for the rescue dashboard.
export function useSosCalls(): SosCall[] {
  const [calls, setCalls] = useState<SosCall[]>([]);
  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    client
      .from("sos")
      .select("*")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }) => setCalls((current) => [...(data ?? []), ...current.filter((c) => !data?.some((d) => d.id === c.id))]));
    const channel = client
      // One channel per screen using this hook: a shared name crashes Supabase when a second screen subscribes.
      .channel(`sos-live-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "sos" }, (payload) =>
        setCalls((current) => [payload.new as SosCall, ...current.filter((c) => c.id !== (payload.new as SosCall).id)]),
      )
      .subscribe();
    return () => {
      client.removeChannel(channel);
    };
  }, []);
  return calls;
}
