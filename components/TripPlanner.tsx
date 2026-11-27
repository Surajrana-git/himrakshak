import { useState } from "react";
import RouteOptionCard from "@/components/RouteOptionCard";
import { PLACES, type Place } from "@/lib/trip";
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

const byName = (name: string) => PLACES.find((p) => p.name === name)!;
const DHAMS = PLACES.filter((p) => p.dham);
const TOWNS = PLACES.filter((p) => !p.dham);

// "Kahan jaana hai?" → route options (safest / fastest) → Start.
export default function TripPlanner({ from, to, options, loading, failed, selected, avoidsClosures, onFrom, onTo, onPick, onStart, onClose }: Props) {
  const [gpsError, setGpsError] = useState<string | null>(null);

  function useMyLocation() {
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        // The router only covers Uttarakhand.
        if (lat < 29.5 || lat > 31.5 || lon < 77.5 || lon > 80.5) {
          setGpsError("You are outside Uttarakhand. Pick a starting point from the list.");
          return;
        }
        onFrom({ name: "My location", hindi: "My location", lat, lon, dham: false });
      },
      () => setGpsError("Could not get your location. Pick from the list."),
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

      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold">From</span>
        <div className="flex gap-2">
          <select
            value={from.name}
            onChange={(e) => onFrom(byName(e.target.value))}
            className="min-h-12 flex-1 rounded-xl border-2 border-ink/20 bg-snow px-3"
          >
            {from.name === "My location" && <option value="My location">My location</option>}
            {TOWNS.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
          <button onClick={useMyLocation} aria-label="My location" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-ink text-snow">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
            </svg>
          </button>
        </div>
        {gpsError && <span className="text-sm text-danger">{gpsError}</span>}
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold">To</span>
        <select
          value={to?.name ?? ""}
          onChange={(e) => onTo(byName(e.target.value))}
          className="min-h-12 rounded-xl border-2 border-ink/20 bg-snow px-3 font-semibold"
        >
          <option value="" disabled>
            Choose a dham or town
          </option>
          <optgroup label="Char Dham">
            {DHAMS.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </optgroup>
          <optgroup label="Towns">
            {TOWNS.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </optgroup>
        </select>
      </label>

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
          <p className="text-xs text-muted">Risk = live rain every 25 km along the route (Open-Meteo), now and the next 6 hours.</p>
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
