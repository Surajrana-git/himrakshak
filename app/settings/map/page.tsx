"use client";

import { useEffect, useState } from "react";
import Screen, { Card, Chips, MenuRow, SECONDARY } from "@/components/Screen";
import Toggle from "@/components/Toggle";
import { setSetting, useSettings, type Settings } from "@/lib/settings";

const TYPES = ["Standard", "Satellite", "Terrain"] as const;
const TILE_CACHE = "himrakshak-tiles-v5"; // public/sw.js

export default function MapPreferencesPage() {
  const s = useSettings();
  const [usedMb, setUsedMb] = useState<number | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    navigator.storage
      ?.estimate()
      .then((e) => setUsedMb(Math.round((e.usage ?? 0) / 1_000_000)))
      .catch(() => {});
  }, [note]);

  async function clearMaps() {
    await caches.delete(TILE_CACHE).catch(() => false);
    try {
      localStorage.removeItem("himrakshak-offline-maps");
    } catch {}
    setNote("Saved map tiles cleared");
  }

  const current = TYPES.find((t) => t.toLowerCase() === s.mapType) ?? "Standard";
  return (
    <Screen icon="map" title="Map Preferences" subtitle="Map type, download, and storage">
      <Card title="Map type" hint="The map opens in this style. The layers button changes it for now.">
        <Chips options={TYPES} value={current} onChange={(t) => setSetting("mapType", t.toLowerCase() as Settings["mapType"])} label="Map type" />
      </Card>
      <Toggle label="Keep screen on while navigating" hint="The phone does not lock during a trip." on={s.keepScreenOn} onChange={(v) => setSetting("keepScreenOn", v)} />
      <MenuRow icon="download" title="Download maps" subtitle="Use the map without internet" href="/offline-maps" />
      <Card title="Storage">
        <p>{usedMb === null ? "Checking…" : `The app uses about ${usedMb} MB on this phone (maps, photos, last risk data).`}</p>
        <button onClick={clearMaps} className={`${SECONDARY} mt-3`}>
          Clear saved map tiles
        </button>
        {note && <p className="mt-2 text-center font-semibold">{note}</p>}
      </Card>
    </Screen>
  );
}
