"use client";

import { useState } from "react";
import { PLACES, type Place } from "@/lib/trip";
import { distanceKm } from "@/lib/geo";
import { getGpsFix, type GpsFix } from "@/lib/sos";

type Props = {
  onShow: (place: Place) => void;
  onRoute: (place: Place) => void;
  onSave: ((place: Place) => void) | null; // null when signed out
  onClose: () => void;
};

const MAX_KM = [null, 50, 150] as const;

// Char Dham towns and shrines: search, filter by type and distance, show on map or plan a route.
export default function PlacesScreen({ onShow, onRoute, onSave, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<"all" | "dham" | "town">("all");
  const [maxKm, setMaxKm] = useState<(typeof MAX_KM)[number]>(null);
  const [me, setMe] = useState<GpsFix | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  async function pickDistance(km: (typeof MAX_KM)[number]) {
    setMaxKm(km);
    if (km !== null && !me) {
      try {
        setMe(await getGpsFix());
      } catch (e) {
        setGpsError(e instanceof Error ? e.message : "Location nahi mili");
      }
    }
  }

  const q = query.trim().toLowerCase();
  const list = PLACES.map((p) => ({ place: p, km: me ? distanceKm(me.lat, me.lon, p.lat, p.lon) : null }))
    .filter(({ place }) => !q || place.name.toLowerCase().includes(q) || place.hindi.includes(query.trim()))
    .filter(({ place }) => type === "all" || (type === "dham") === place.dham)
    .filter(({ km }) => maxKm === null || km === null || km <= maxKm)
    .sort((a, b) => (a.km ?? 0) - (b.km ?? 0));

  return (
    <section className="animate-sheet absolute inset-x-0 bottom-0 z-20 flex max-h-[75dvh] flex-col rounded-t-3xl bg-white pb-28 shadow-[0_-8px_24px_rgba(20,35,31,0.18)]" aria-label="Places">
      <button onClick={onClose} aria-label="Band karein / Close" className="flex min-h-10 shrink-0 items-center justify-center">
        <span className="h-1.5 w-12 rounded-full bg-ink/25" />
      </button>
      <div className="flex flex-col gap-3 overflow-y-auto px-4">
        <h2 className="font-display text-2xl font-bold">Places · जगहें</h2>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Jagah dhoondhein / Search places"
          className="min-h-12 rounded-full border border-green/40 px-4 outline-none focus:border-green"
        />
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", "Sab / All"],
              ["dham", "Dham"],
              ["town", "Shahar / Towns"],
            ] as const
          ).map(([value, label]) => (
            <button key={value} onClick={() => setType(value)} aria-pressed={type === value} className={`min-h-10 rounded-full px-3 text-sm font-semibold ${type === value ? "bg-green text-white" : "bg-mint text-green"}`}>
              {label}
            </button>
          ))}
          {MAX_KM.map((km) => (
            <button key={String(km)} onClick={() => pickDistance(km)} aria-pressed={maxKm === km} className={`min-h-10 rounded-full px-3 text-sm font-semibold ${maxKm === km ? "bg-green text-white" : "bg-mint text-green"}`}>
              {km === null ? "Koi doori / Any distance" : `< ${km} km`}
            </button>
          ))}
        </div>
        {gpsError && <p className="text-sm text-danger">{gpsError}</p>}
        <ul className="flex flex-col divide-y divide-ink/10">
          {list.map(({ place, km }) => (
            <li key={place.name} className="flex items-center gap-2 py-2">
              <button onClick={() => onShow(place)} className="flex min-h-12 min-w-0 flex-1 flex-col text-left">
                <span className="font-semibold">
                  {place.hindi} · {place.name}
                </span>
                <span className="text-sm text-muted">
                  {place.dham ? "Char Dham" : "Shahar / Town"}
                  {km !== null ? ` · ${Math.round(km)} km door` : ""}
                </span>
              </button>
              {onSave && (
                <button onClick={() => onSave(place)} aria-label={`${place.name} save karein`} className="flex h-12 w-12 items-center justify-center text-green">
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden>
                    <path d="M6 3h12v18l-6-4-6 4z" />
                  </svg>
                </button>
              )}
              <button onClick={() => onRoute(place)} className="min-h-12 shrink-0 rounded-full bg-green px-4 text-sm font-semibold text-white">
                Rasta
              </button>
            </li>
          ))}
        </ul>
        {list.length === 0 && <p className="text-sm text-muted">Koi jagah nahi mili.</p>}
      </div>
    </section>
  );
}
