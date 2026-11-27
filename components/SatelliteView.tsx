"use client";

import { useEffect, useState } from "react";
import type { SatellitePhoto, SatelliteView as View } from "@/lib/satellite";

type Props = { title: string; lat: number; lon: number; onClose: () => void };
type Loaded = { view: View | null; error: string | null };

const daysAgo = (date: string) => Math.round((Date.parse(new Date().toISOString().slice(0, 10)) - Date.parse(date)) / 86400_000);

const ago = (days: number) => (days <= 0 ? "today" : days === 1 ? "1 day ago" : `${days} days ago`);

function Photo({ label, photo }: { label: string; photo: SatellitePhoto }) {
  const [state, setState] = useState<"loading" | "ok" | "failed">("loading");
  return (
    <figure className="flex flex-col gap-1">
      <figcaption className="flex items-baseline justify-between text-sm">
        <span className="font-display font-semibold">{label}</span>
        <span className="text-muted">
          {photo.date} · {ago(daysAgo(photo.date))}
        </span>
      </figcaption>
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-ink/10">
        {state === "loading" && <p className="absolute inset-0 flex items-center justify-center text-sm text-muted">Loading satellite photo…</p>}
        {state === "failed" && <p className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-muted">The image server did not answer. Try again in a minute.</p>}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.imageUrl} alt={`${label}: Sentinel-2 satellite photo, ${photo.date}`} onLoad={() => setState("ok")} onError={() => setState("failed")} className="h-full w-full object-cover" />
        {/* The point asked about sits in the middle of the crop. */}
        <span className="pointer-events-none absolute top-1/2 left-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-orange" aria-hidden />
      </div>
    </figure>
  );
}

// Latest real satellite photo of a spot next to one from about a month earlier.
export default function SatelliteView({ title, lat, lon, onClose }: Props) {
  const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  const [loaded, setLoaded] = useState<(Loaded & { key: string }) | null>(null);

  useEffect(() => {
    let stale = false;
    fetch(`/api/satellite?lat=${lat}&lon=${lon}`)
      .then(async (res) => (res.ok ? res.json() : Promise.reject(new Error((await res.json()).error ?? `Error ${res.status}`))))
      .then((view: View) => !stale && setLoaded({ key, view, error: null }))
      .catch((e: Error) => !stale && setLoaded({ key, view: null, error: e.message }));
    return () => {
      stale = true;
    };
  }, [key, lat, lon]);
  const current = loaded?.key === key ? loaded : null;

  return (
    <div className="animate-fade fixed inset-0 z-40 flex items-end bg-ink/50 md:items-center md:justify-center" onClick={onClose}>
      <section
        role="dialog"
        aria-label="Satellite view"
        onClick={(e) => e.stopPropagation()}
        className="animate-sheet flex max-h-[92dvh] w-full flex-col gap-3 overflow-y-auto rounded-t-3xl bg-white p-4 pb-[max(20px,env(safe-area-inset-bottom))] md:max-w-lg md:rounded-3xl"
      >
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-xs font-semibold tracking-[0.2em] text-green uppercase">Satellite view · real photo</p>
            <h2 className="font-display text-xl font-bold">{title}</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ink/10">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        {!current && <p className="text-sm text-muted">Finding the newest clear satellite pass…</p>}
        {current?.error && <p className="text-sm text-danger">{current.error}</p>}
        {current?.view && !current.view.now && <p className="text-sm text-muted">No clear satellite photo in the last 4 months (clouds).</p>}
        {current?.view?.now && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Photo label="Now" photo={current.view.now} />
            {current.view.before && <Photo label="About a month before" photo={current.view.before} />}
          </div>
        )}

        <p className="text-xs text-muted">
          ESA Sentinel-2, 10 m per pixel, a new pass about every 5 days (found with Element84 Earth Search, cut with TiTiler). The orange ring marks the spot. Compare the
          two photos: fresh bare earth or a grey streak across the road that was green before can mean a new slide. Small rockfalls are too small to see; driver
          photos show those.
        </p>
      </section>
    </div>
  );
}
