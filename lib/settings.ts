"use client";

import { useSyncExternalStore } from "react";

// App preferences, kept on this phone (Settings screens change them; the map, alerts and voice read them).
export type Settings = {
  mapType: "standard" | "satellite" | "terrain";
  riskAlerts: boolean; // phone notification when a stretch is at high risk today
  voice: boolean; // spoken turns and hazard warnings while driving
  vibrate: boolean; // buzz on hazard alerts
  keepScreenOn: boolean; // screen stays on while navigating
};

const DEFAULTS: Settings = { mapType: "standard", riskAlerts: true, voice: true, vibrate: true, keepScreenOn: true };
const KEY = "himrakshak-settings";
const listeners = new Set<() => void>();

function raw(): string {
  try {
    return localStorage.getItem(KEY) ?? "{}";
  } catch {
    return "{}";
  }
}

export function getSettings(): Settings {
  if (typeof window === "undefined") return DEFAULTS;
  return { ...DEFAULTS, ...(JSON.parse(raw()) as Partial<Settings>) };
}

export function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...getSettings(), [key]: value }));
  } catch {}
  listeners.forEach((l) => l());
}

export function useSettings(): Settings {
  const text = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    raw,
    () => "{}",
  );
  return { ...DEFAULTS, ...(JSON.parse(text) as Partial<Settings>) };
}
