"use client";

import { useState, useSyncExternalStore } from "react";
import Screen, { PRIMARY } from "@/components/Screen";
import Icon from "@/components/Icon";
import { downloadedRegions, downloadRegion, REGIONS, tileCount, type Downloaded } from "@/lib/offline-maps";

const noop = () => () => {};
const mb = (bytes: number) => `${Math.max(1, Math.round(bytes / 1_000_000))} MB`;

// Saves map areas on the phone, for the stretches of road with no signal.
export default function OfflineMapsPage() {
  // Saved list from the phone (none on the server render, so the first paint matches).
  const stored = useSyncExternalStore(noop, () => JSON.stringify(downloadedRegions()), () => "[]");
  const [fresh, setFresh] = useState<Downloaded[]>([]);
  const done = [...(JSON.parse(stored) as Downloaded[]).filter((d) => !fresh.some((f) => f.id === d.id)), ...fresh];
  const [picked, setPicked] = useState(REGIONS[0].id);
  const [progress, setProgress] = useState<{ id: string; done: number; total: number } | null>(null);
  const [error, setError] = useState("");

  async function download() {
    const region = REGIONS.find((r) => r.id === picked)!;
    setError("");
    setProgress({ id: region.id, done: 0, total: tileCount(region) });
    try {
      const result = await downloadRegion(region, (d, total) => setProgress({ id: region.id, done: d, total }));
      setFresh((cur) => [...cur.filter((d) => d.id !== result.id), result]);
    } catch {
      setError("Download failed. Check the internet and try again.");
    }
    setProgress(null);
  }

  return (
    <Screen
      icon="download"
      title="Offline Maps"
      subtitle="Download maps to use without internet."
      footer={
        <button onClick={download} disabled={progress !== null} className={PRIMARY}>
          <Icon name="download" />
          {progress ? `Downloading… ${Math.round((progress.done / progress.total) * 100)}%` : "Download Map"}
        </button>
      }
    >
      <section className="rounded-3xl border border-ink/10 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-semibold">Maps</h2>
          <span className="text-sm text-muted">{done.length} downloaded</span>
        </div>
        <ul className="mt-2 divide-y divide-ink/10">
          {REGIONS.map((r) => {
            const d = done.find((x) => x.id === r.id);
            return (
              <li key={r.id}>
                <button onClick={() => setPicked(r.id)} className={`flex min-h-14 w-full items-center gap-3 rounded-xl px-2 text-left ${picked === r.id ? "bg-mint" : ""}`}>
                  <Icon name="map" className="h-6 w-6 text-muted" />
                  <span className="flex-1">
                    <b>{r.name}</b> {d ? `(${mb(d.bytes)})` : <span className="text-sm text-muted">· {tileCount(r)} map tiles</span>}
                  </span>
                  {d ? <Icon name="check" className="h-6 w-6 text-green" /> : <Icon name="download" className="h-6 w-6 text-green" />}
                </button>
              </li>
            );
          })}
        </ul>
      </section>
      {error && <p className="text-center font-semibold text-danger">{error}</p>}
      <section className="rounded-3xl bg-mint p-4">
        <h2 className="flex items-center gap-2 font-display font-semibold text-green-dark">
          <Icon name="info" className="h-5 w-5" /> Offline Map Benefits
        </h2>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
          <span className="flex flex-col items-center gap-1">
            <Icon name="wifiOff" className="text-green" /> Use without internet
          </span>
          <span className="flex flex-col items-center gap-1">
            <Icon name="route" className="text-green" /> Navigate & explore anytime
          </span>
          <span className="flex flex-col items-center gap-1">
            <Icon name="download" className="text-green" /> Save data while travelling
          </span>
        </div>
      </section>
      <p className="text-xs text-muted">Map tiles come from OpenFreeMap. The last risk map and SOS screen are also kept on the phone.</p>
    </Screen>
  );
}
