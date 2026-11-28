import { useEffect, useState } from "react";
import Link from "next/link";
import RouteOptionCard from "@/components/RouteOptionCard";
import PlaceField from "@/components/PlaceField";
import Icon, { type IconName } from "@/components/Icon";
import { PLACES, type Place } from "@/lib/trip";
import { inUttarakhand } from "@/lib/area";
import type { RouteOption } from "@/lib/routes";
import { RISK_STYLE } from "@/lib/risk";
import type { Costing } from "@/lib/valhalla";
import { googleDirectionsUrl } from "@/lib/google-maps";
import { tripCost, useVehicles, type Vehicle } from "@/lib/vehicles";
import type { FuelStop } from "@/lib/fuel";

type Props = {
  from: Place;
  to: Place | null;
  mode: Costing;
  options: RouteOption[] | null;
  loading: boolean;
  failed: boolean;
  selected: RouteOption | null;
  avoidsClosures: boolean;
  onFrom: (place: Place) => void;
  onTo: (place: Place) => void;
  onMode: (mode: Costing) => void;
  onPick: (id: string) => void;
  onStart: () => void;
  onSave: ((option: RouteOption) => Promise<string | null>) | null; // null when not signed in
  fuel: FuelStop[] | null; // pumps along the chosen road; null while loading
  onClose: () => void;
};

const DHAMS = PLACES.filter((p) => p.dham);
const MODES: { id: Costing; label: string; icon: IconName }[] = [
  { id: "auto", label: "Car", icon: "car" },
  { id: "bus", label: "Bus", icon: "bus" },
  { id: "motorcycle", label: "Bike", icon: "bike" },
  { id: "pedestrian", label: "Walk", icon: "walk" },
];

const hoursText = (h: number) => (h < 1 ? `${Math.round(h * 60)} min` : `${Math.floor(h)} hr ${Math.round((h % 1) * 60)} min`);

// Until the driver adds their own vehicle: a typical hill car and commuter bike, petrol near ₹95/L
// (Uttarakhand, Nov 2026). Always labelled "typical" on screen.
const TYPICAL: Record<"auto" | "motorcycle", Vehicle> = {
  auto: { id: "typical-car", type: "Car", name: "Typical car (15 km/L)", registration: "", mileageKmpl: 15, fuel: "Petrol", pricePerLitre: 95, maintenancePerKm: 0 },
  motorcycle: { id: "typical-bike", type: "Bike", name: "Typical bike (45 km/L)", registration: "", mileageKmpl: 45, fuel: "Petrol", pricePerLitre: 95, maintenancePerKm: 0 },
};
type Eta = Partial<Record<Costing, { km: number; hours: number } | null>>;

// "From - To (Trip)" → route options (safest / fastest) with trip cost → Start.
export default function TripPlanner(p: Props) {
  const { from, to, mode, options, loading, failed, selected, avoidsClosures } = p;
  const [gpsError, setGpsError] = useState<string | null>(null);
  const vehicles = useVehicles();
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const vehicle = vehicles.find((v) => v.id === vehicleId) ?? vehicles[0] ?? null;
  const [note, setNote] = useState("");
  const drives = mode === "auto" || mode === "motorcycle";
  const costVehicle = drives ? (vehicle ?? TYPICAL[mode as "auto" | "motorcycle"]) : null;
  const cost = selected && costVehicle ? tripCost(selected.km, costVehicle) : null;

  // Time by car, bike and on foot for the tabs, like a maps app.
  const [eta, setEta] = useState<{ key: string; data: Eta } | null>(null);
  const etaKey = to ? `${from.lat},${from.lon}|${to.lat},${to.lon}` : "";
  useEffect(() => {
    if (!etaKey) return;
    const [f, t] = etaKey.split("|");
    let stale = false;
    fetch(`/api/eta?from=${f}&to=${t}`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: Eta) => !stale && setEta({ key: etaKey, data }))
      .catch(() => {});
    return () => {
      stale = true;
    };
  }, [etaKey]);
  const times = eta?.key === etaKey ? eta.data : {};

  function useMyLocation() {
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        // The router only covers Uttarakhand.
        if (!inUttarakhand(lat, lon)) return setGpsError("You are outside Uttarakhand. Search a starting place instead.");
        p.onFrom({ name: "My location", hindi: "My location", lat, lon, dham: false });
      },
      () => setGpsError("Could not get your location. Search a starting place instead."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function share(o: RouteOption) {
    const text = `${from.name} → ${to?.name}: ${Math.round(o.km)} km, ${hoursText(o.hours)}, ${RISK_STYLE[o.level].label.toLowerCase()} of landslides (Himrakshak). ${googleDirectionsUrl(o.coordinates)}`;
    if (navigator.share) await navigator.share({ text }).catch(() => {});
    else {
      await navigator.clipboard.writeText(text).catch(() => {});
      setNote("Route copied");
    }
  }

  async function save(o: RouteOption) {
    if (!p.onSave) return setNote("Sign in to save routes.");
    const error = await p.onSave(o);
    setNote(error ? `Could not save: ${error}` : "Route saved to My Routes");
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
          <Icon name="route" className="h-6 w-6 text-green" /> From - To (Trip)
        </h2>
        <button onClick={p.onClose} aria-label="Close" className="flex h-12 w-12 items-center justify-center rounded-full bg-ink/10">
          <Icon name="close" />
        </button>
      </div>

      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <PlaceField label="From (Start Location)" value={from} placeholder="Search a starting place" onPick={p.onFrom} />
        </div>
        <button onClick={useMyLocation} aria-label="Start from my location" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green text-white">
          <Icon name="locate" />
        </button>
      </div>
      {gpsError && <span className="text-sm text-danger">{gpsError}</span>}
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <PlaceField label="To (Destination)" value={to} placeholder="Search any place in Uttarakhand" onPick={p.onTo} />
        </div>
        <button
          onClick={() => {
            if (!to) return;
            const oldFrom = from;
            p.onFrom(to);
            p.onTo(oldFrom);
          }}
          disabled={!to}
          aria-label="Swap locations"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-green text-green disabled:opacity-40"
        >
          <Icon name="swap" />
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {DHAMS.map((d) => (
          <button
            key={d.name}
            onClick={() => p.onTo(d)}
            aria-pressed={to?.name === d.name}
            className={`min-h-10 rounded-full border-2 px-3 text-sm font-semibold ${to?.name === d.name ? "border-green bg-mint text-green-dark" : "border-ink/15"}`}
          >
            {/* "Gaurikund (Kedarnath)" → "Kedarnath": drivers know the dham name */}
            {d.name.match(/\((.*)\)/)?.[1] ?? d.name}
          </button>
        ))}
      </div>

      <div role="radiogroup" aria-label="Travel by" className="grid grid-cols-4 gap-2">
        {MODES.map((m) => (
          <button
            key={m.id}
            role="radio"
            aria-checked={mode === m.id}
            onClick={() => p.onMode(m.id)}
            className={`flex min-h-14 flex-col items-center justify-center rounded-2xl border-2 text-xs font-semibold ${mode === m.id ? "border-green bg-mint text-green-dark" : "border-ink/10"}`}
          >
            <Icon name={m.icon} className="h-6 w-6" />
            {m.label}
            <span className="text-[11px] font-bold text-green-dark">{times[m.id] ? hoursText(times[m.id]!.hours) : m.id === "bus" ? "" : to ? "…" : ""}</span>
          </button>
        ))}
      </div>

      {drives && (
        <div className="rounded-2xl bg-mint p-3">
          <div className="flex items-center justify-between text-sm font-semibold">
            <span>Select Saved Vehicle</span>
            <Link href="/vehicles" className="text-green underline">
              {vehicles.length ? "Add vehicle" : "Add your vehicle"}
            </Link>
          </div>
          {vehicles.length > 0 ? (
            <select value={vehicle?.id ?? ""} onChange={(e) => setVehicleId(e.target.value)} className="mt-2 min-h-12 w-full rounded-full border-2 border-ink/15 bg-white px-4">
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} · {v.mileageKmpl} km/L · {v.fuel} ₹{v.pricePerLitre}/L
                </option>
              ))}
            </select>
          ) : (
            <p className="mt-1 text-sm text-muted">Showing a {mode === "motorcycle" ? "typical bike (45 km/L)" : "typical car (15 km/L)"}, petrol ₹95/L. Add your vehicle for your own cost.</p>
          )}
        </div>
      )}

      {loading && <p className="text-sm text-muted">Checking routes and rain…</p>}
      {failed && <p className="text-sm text-danger">Cannot get routes right now (routing server). Try again shortly.</p>}
      {options?.length === 0 && <p className="text-sm text-danger">No route found. The road may be closed.</p>}
      {options && options.length > 0 && (
        <>
          {avoidsClosures && <p className="text-sm font-semibold text-danger">Routes shown avoid closed roads.</p>}
          <ul className="flex flex-col gap-2">
            {options.map((o) => (
              <li key={o.id}>
                <RouteOptionCard option={o} selected={o.id === selected?.id} onSelect={() => p.onPick(o.id)} />
              </li>
            ))}
          </ul>
          {selected && (
            <section className="rounded-3xl border border-ink/10 p-4 shadow-sm">
              <h3 className="font-display text-lg font-bold">Route Details</h3>
              <dl className="mt-2 grid grid-cols-[1fr_auto] gap-y-1.5 text-sm">
                <dt className="flex items-center gap-2">
                  <Icon name="route" className="h-4 w-4 text-green" /> Distance
                </dt>
                <dd className="font-semibold">{selected.km.toFixed(1)} km</dd>
                <dt className="flex items-center gap-2">
                  <Icon name="clock" className="h-4 w-4 text-green" /> Estimated Time
                </dt>
                <dd className="font-semibold">{hoursText(selected.hours)}</dd>
                <dt className="flex items-center gap-2">
                  <Icon name="mountain" className="h-4 w-4 text-green" /> Route Risk
                </dt>
                <dd className="font-semibold">{RISK_STYLE[selected.level].label}</dd>
                {cost && (
                  <>
                    <dt className="flex items-center gap-2">
                      <Icon name="fuel" className="h-4 w-4 text-green" /> Petrol needed <span className="text-xs text-muted">({costVehicle?.mileageKmpl} km/L{vehicle ? "" : ", typical"})</span>
                    </dt>
                    <dd className="font-semibold">{cost.litres.toFixed(2)} L</dd>
                    <dt className="flex items-center gap-2">
                      <Icon name="coin" className="h-4 w-4 text-green" /> Estimated cost <span className="text-xs text-muted">(₹{costVehicle?.pricePerLitre}/L{vehicle?.maintenancePerKm ? " + upkeep" : ""})</span>
                    </dt>
                    <dd className="font-display text-lg font-bold text-green-dark">₹{cost.rupees.toFixed(2)}</dd>
                  </>
                )}
              </dl>
              {drives && (
                <div className="mt-3 rounded-2xl bg-mint p-3">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <Icon name="fuel" className="h-5 w-5 text-green" />
                    {p.fuel === null
                      ? "Finding petrol and CNG pumps on this road…"
                      : `${p.fuel.length} petrol pumps on this road${p.fuel.some((f) => f.cng) ? `, ${p.fuel.filter((f) => f.cng).length} with CNG` : ""}`}
                  </p>
                  {p.fuel && p.fuel.length > 0 && (
                    <ul className="mt-1 text-xs">
                      {p.fuel.slice(0, 6).map((f) => (
                        <li key={`${f.lat},${f.lon}`}>
                          km {f.km} · {f.name}
                          {f.cng ? " · CNG" : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                  {p.fuel && p.fuel.length === 0 && <p className="text-xs text-muted">None mapped near this road. Fill up before you start.</p>}
                </div>
              )}
              {mode === "pedestrian" && selected.km > 100 && (
                <p className="mt-2 rounded-xl bg-mint p-2 text-xs">Long walk: shown along the road, timed at 4.5 km/h. Plan night stops on the way.</p>
              )}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button onClick={() => save(selected)} className="flex min-h-12 items-center justify-center gap-2 rounded-full border-2 border-green font-semibold text-green-dark">
                  <Icon name="bookmark" className="h-5 w-5" /> Save Route
                </button>
                <button onClick={() => share(selected)} className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-mint font-semibold text-green-dark">
                  <Icon name="share" className="h-5 w-5" /> Share Route
                </button>
              </div>
              {note && <p className="mt-2 text-center text-sm font-semibold">{note}</p>}
            </section>
          )}
          <p className="text-xs text-muted">Risk for every 10 km = 40% terrain (BIS IS 14496 hazard score from slope and past slides) + 60% rain (past 24 h vs 140 mm, next 6 h vs 30 mm, Open-Meteo). A driver-confirmed block is always red.</p>
          <button onClick={p.onStart} disabled={!selected} className="min-h-14 rounded-full bg-green font-display text-xl text-white shadow-lg">
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
