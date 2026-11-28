"use client";

import { useEffect, useRef, useState } from "react";
import { Map as MapLibre, setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import Icon from "@/components/Icon";
import { usePlaceSearch } from "@/lib/place-search";
import { getGpsFix } from "@/lib/sos";

setWorkerUrl("/maplibre-gl-worker.mjs");

export type Spot = { lat: number; lon: number };

const STYLE = "https://tiles.openfreemap.org/styles/liberty";
const RUDRAPRAYAG: Spot = { lat: 30.2846, lon: 78.9873 };

// Pick an exact spot: the pin stays in the middle and the map moves under it (drag to adjust),
// with place search and "my location". Starts at the phone's GPS when it can.
export default function PinPicker({ onChange, height = "h-72" }: { onChange: (spot: Spot) => void; height?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibre | null>(null);
  const [query, setQuery] = useState("");
  const { results } = usePlaceSearch(query);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!box.current) return;
    const m = new MapLibre({ container: box.current, style: STYLE, center: [RUDRAPRAYAG.lon, RUDRAPRAYAG.lat], zoom: 13, attributionControl: { compact: true } });
    map.current = m;
    const report = () => {
      const c = m.getCenter();
      onChange({ lat: c.lat, lon: c.lng });
    };
    m.on("moveend", report);
    report();
    getGpsFix()
      .then((f) => m.jumpTo({ center: [f.lon, f.lat], zoom: 16 }))
      .catch(() => setNote("Location is off. Search a place or move the map to the spot."));
    return () => m.remove();
    // onChange is a fresh function each render; the map is made once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function locate() {
    setNote("Finding your location…");
    getGpsFix()
      .then((f) => {
        map.current?.flyTo({ center: [f.lon, f.lat], zoom: 16 });
        setNote("");
      })
      .catch((e: unknown) => setNote(e instanceof Error ? e.message : "Could not get your location"));
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="flex min-h-12 items-center gap-2 rounded-full border-2 border-ink/15 bg-white px-4">
        <Icon name="search" className="h-5 w-5 text-muted" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search a place, landmark, or address" className="min-w-0 flex-1 bg-transparent outline-none" />
      </label>
      {query.length >= 2 && results.length > 0 && (
        <ul className="rounded-2xl border border-ink/10 bg-white shadow-sm">
          {results.slice(0, 5).map((p) => (
            <li key={p.name}>
              <button
                type="button"
                onClick={() => {
                  map.current?.flyTo({ center: [p.lon, p.lat], zoom: 15 });
                  setQuery("");
                }}
                className="flex min-h-12 w-full items-center gap-2 px-4 text-left"
              >
                <Icon name="pin" className="h-5 w-5 text-green" />
                {p.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className={`relative overflow-hidden rounded-3xl border border-ink/10 ${height}`}>
        <div ref={box} className="h-full w-full" />
        <span className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full text-danger" aria-hidden>
          <svg viewBox="0 0 24 24" className="h-11 w-11 drop-shadow" fill="currentColor">
            <path d="M12 23s7-6.3 7-12.2A7 7 0 0 0 5 10.8C5 16.7 12 23 12 23zm0-9a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" />
          </svg>
        </span>
        <button type="button" onClick={locate} aria-label="My location" className="absolute right-3 bottom-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-green shadow-md">
          <Icon name="locate" />
        </button>
      </div>
      {note && <p className="text-sm text-muted">{note}</p>}
      <p className="text-xs text-muted">Move the map to put the red pin on the exact spot.</p>
    </div>
  );
}
