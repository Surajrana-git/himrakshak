import { useState } from "react";
import RouteOptionCard from "@/components/RouteOptionCard";
import PlaceField from "@/components/PlaceField";
import { PLACES, type Place } from "@/lib/trip";
import { inUttarakhand } from "@/lib/area";
import type { RouteOption } from "@/lib/routes";
import { googleDirectionsUrl } from "@/lib/google-maps";

type Props = {
  from: Place;
  to: Place | null;
  options: RouteOption[] | null;
  loading: boolean;
  failed: boolean;
  selected: RouteOption | null;
  avoidsClosures: boolean;
  onFrom: (place: Place) => void;
  onTo: (place: Place) => void;
  onPick: (id: string) => void;
  onStart: () => void;
  onClose: () => void;
};

const DHAMS = PLACES.filter((p) => p.dham);

// "Where to?" → route options (safest / fastest) → Start.
export default function TripPlanner({ from, to, options, loading, failed, selected, avoidsClosures, onFrom, onTo, onPick, onStart, onClose }: Props) {
  const [gpsError, setGpsError] = useState<string | null>(null);

  function useMyLocation() {
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        // The router only covers Uttarakhand.
        if (!inUttarakhand(lat, lon)) {
          setGpsError("You are outside Uttarakhand. Search a starting place instead.");
          return;
        }
        onFrom({ name: "My location", hindi: "My location", lat, lon, dham: false });
      },
      () => setGpsError("Could not get your location. Search a starting place instead."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl">Where to?</h2>
        <button onClick={onClose} aria-label="Close" className="flex h-12 w-12 items-center justify-center rounded-full bg-ink/10">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>

      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <PlaceField label="From" value={from} placeholder="Search a starting place" onPick={onFrom} />
        </div>
        <button onClick={useMyLocation} aria-label="Start from my location" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green text-white">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
          </svg>
        </button>
      </div>
      {gpsError && <span className="text-sm text-danger">{gpsError}</span>}
      <PlaceField label="To" value={to} placeholder="Search any place in Uttarakhand" onPick={onTo} />
      <div className="flex flex-wrap gap-2">
        {DHAMS.map((p) => (
          <button
            key={p.name}
            onClick={() => onTo(p)}
            aria-pressed={to?.name === p.name}
            className={`min-h-10 rounded-full border-2 px-3 text-sm font-semibold ${to?.name === p.name ? "border-green bg-mint text-green-dark" : "border-ink/15"}`}
          >
            {/* "Gaurikund (Kedarnath)" → "Kedarnath": drivers know the dham name */}
            {p.name.match(/\((.*)\)/)?.[1] ?? p.name}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-muted">Checking routes and rain…</p>}
      {failed && <p className="text-sm text-danger">Cannot get routes right now (routing server). Try again shortly.</p>}
      {options?.length === 0 && <p className="text-sm text-danger">No route found. The road may be closed.</p>}
      {options && options.length > 0 && (
        <>
          {avoidsClosures && <p className="text-sm font-semibold text-danger">Routes shown avoid closed roads.</p>}
          <ul className="flex flex-col gap-2">
            {options.map((o) => (
              <li key={o.id}>
                <RouteOptionCard option={o} selected={o.id === selected?.id} onSelect={() => onPick(o.id)} />
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted">Risk for every 10 km of road = live rain now and in the next 6 h (Open-Meteo) × hillside slope × past landslides nearby (NASA).</p>
          <button onClick={onStart} disabled={!selected} className="min-h-14 rounded-full bg-orange font-display text-xl text-ink shadow-lg">
            Start
          </button>
          {selected && (
            <a
              href={googleDirectionsUrl(selected.coordinates)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-12 items-center justify-center rounded-full border-2 border-ink font-semibold"
            >
              Open this route in Google Maps
            </a>
          )}
        </>
      )}
    </section>
  );
}
