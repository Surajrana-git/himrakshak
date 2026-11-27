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
          setGpsError("Aap Uttarakhand ke bahar hain. Shuruaat ki jagah list se chunein.");
          return;
        }
        onFrom({ name: "Meri location", hindi: "मेरी जगह", lat, lon, dham: false });
      },
      () => setGpsError("Location nahi mili. List se chunein."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl">Kahan jaana hai? / Where to?</h2>
        <button onClick={onClose} aria-label="Band karein / Close" className="flex h-12 w-12 items-center justify-center rounded-full bg-ink/10">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold">Kahan se / From</span>
        <div className="flex gap-2">
          <select
            value={from.name}
            onChange={(e) => onFrom(byName(e.target.value))}
            className="min-h-12 flex-1 rounded-xl border-2 border-ink/20 bg-snow px-3"
          >
            {from.name === "Meri location" && <option value="Meri location">मेरी जगह · My location</option>}
            {TOWNS.map((p) => (
              <option key={p.name} value={p.name}>
                {p.hindi} · {p.name}
              </option>
            ))}
          </select>
          <button onClick={useMyLocation} aria-label="Meri location / My location" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-ink text-snow">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
            </svg>
          </button>
        </div>
        {gpsError && <span className="text-sm text-danger">{gpsError}</span>}
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold">Kahan tak / To</span>
        <select
          value={to?.name ?? ""}
          onChange={(e) => onTo(byName(e.target.value))}
          className="min-h-12 rounded-xl border-2 border-ink/20 bg-snow px-3 font-semibold"
        >
          <option value="" disabled>
            Dham ya shahar chunein
          </option>
          <optgroup label="Char Dham">
            {DHAMS.map((p) => (
              <option key={p.name} value={p.name}>
                {p.hindi} · {p.name}
              </option>
            ))}
          </optgroup>
          <optgroup label="Shahar / Towns">
            {TOWNS.map((p) => (
              <option key={p.name} value={p.name}>
                {p.hindi} · {p.name}
              </option>
            ))}
          </optgroup>
        </select>
      </label>

      {loading && <p className="text-sm text-muted">Raste aur baarish check kar rahe hain…</p>}
      {failed && <p className="text-sm text-danger">Raste abhi nahi mil rahe (routing server). Thodi der baad try karein.</p>}
      {options?.length === 0 && <p className="text-sm text-danger">Koi rasta nahi mila. Rasta band ho sakta hai.</p>}
      {options && options.length > 0 && (
        <>
          {avoidsClosures && <p className="text-sm font-semibold text-danger">Band raston se bachkar raste dikhaye gaye hain.</p>}
          <ul className="flex flex-col gap-2">
            {options.map((o) => (
              <li key={o.id}>
                <RouteOptionCard option={o} selected={o.id === selected?.id} onSelect={() => onPick(o.id)} />
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted">Risk = raste pe har 25 km ki live baarish (Open-Meteo), abhi + agle 6 ghante.</p>
          <button onClick={onStart} disabled={!selected} className="min-h-14 rounded-full bg-orange font-display text-xl text-ink shadow-lg">
            Shuru karein / Start
          </button>
          {selected && (
            <a
              href={googleDirectionsUrl(selected.coordinates)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-12 items-center justify-center rounded-full border-2 border-ink font-semibold"
            >
              Yahi rasta Google Maps mein kholein
            </a>
          )}
        </>
      )}
    </section>
  );
}
