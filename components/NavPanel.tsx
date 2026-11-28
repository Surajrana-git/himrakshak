import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import ReportIcon from "@/components/ReportIcon";
import type { FuelStop } from "@/lib/fuel";

type Props = {
  destination: string;
  remainingKm: number;
  remainingHours: number;
  gps: boolean;
  arrived: boolean;
  halted: boolean;
  stopPlace: string;
  onDemo: (kind: "jam" | "ai" | "closure") => void;
  onReport: (() => void) | null;
  speedKmh: number | null;
  nextFuel: FuelStop | null; // the next pump ahead on this road
  fuelKmAway: number | null;
  onStop: () => void;
};

// The clock ticks every 30 s; the server render shows no time rather than a wrong one.
function subscribeClock(onChange: () => void) {
  const timer = setInterval(onChange, 30_000);
  return () => clearInterval(timer);
}
const clockNow = () => Math.floor(Date.now() / 30_000) * 30_000;

function arrivalClock(now: number, hours: number): string {
  if (now === 0) return "--:--";
  return new Date(now + hours * 3600_000).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" });
}

function duration(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return h > 0 ? `${h} hr ${m} min` : `${m} min`;
}

const pumpLink = (f: FuelStop) => `https://www.google.com/maps/dir/?api=1&destination=${f.lat},${f.lon}&travelmode=driving`;

// Driving screen, kept minimal so the driver looks at the road: speed and buttons float on the
// map, one slim bar at the bottom (end trip · time left · SOS).
export default function NavPanel(p: Props) {
  const now = useSyncExternalStore(subscribeClock, clockNow, () => 0);
  const [demoOpen, setDemoOpen] = useState(false);

  if (p.arrived) {
    return (
      <div className="pointer-events-auto flex flex-col gap-3 rounded-t-3xl bg-white p-4 pb-[max(16px,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(20,35,31,0.18)]">
        <div className="rounded-2xl bg-teal p-4 text-ink">
          <p className="font-display text-3xl">You have arrived!</p>
          <p>{p.destination}</p>
          <p className="mt-1 text-sm">In the mountains, safety comes before speed.</p>
        </div>
        <button onClick={p.onStop} className="min-h-14 rounded-full bg-ink font-display text-xl text-snow">
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="pointer-events-none flex flex-col gap-2">
      {/* Floating over the map: speed on the left; report and refill on the right */}
      <div className="flex items-end justify-between px-3">
        <div className="pointer-events-auto flex h-16 w-16 flex-col items-center justify-center rounded-full bg-white shadow-lg">
          <span className="font-display text-2xl leading-none font-bold">{p.gps && p.speedKmh !== null ? p.speedKmh : "–"}</span>
          <span className="text-[10px] font-semibold">km/h</span>
        </div>
        <div className="pointer-events-auto flex flex-col items-end gap-2">
          {p.nextFuel && p.fuelKmAway !== null && (
            <a
              href={pumpLink(p.nextFuel)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex max-w-[60vw] items-center gap-2 rounded-full bg-white py-2 pr-3 pl-2 text-sm font-semibold shadow-lg"
            >
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${p.nextFuel.cng ? "bg-teal text-ink" : "bg-green text-white"}`}>
                <Icon name="fuel" className="h-5 w-5" />
              </span>
              <span className="truncate">
                {p.nextFuel.cng ? "CNG" : "Petrol"} in {p.fuelKmAway} km
              </span>
            </a>
          )}
          {p.onReport && (
            <button onClick={p.onReport} aria-label="Report a hazard" className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-orange shadow-lg">
              <ReportIcon kind="landslide" className="h-8 w-8" />
            </button>
          )}
        </div>
      </div>

      <div className="pointer-events-auto rounded-t-3xl bg-white px-4 pt-2 pb-[max(12px,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(20,35,31,0.18)]">
        <button onClick={() => setDemoOpen(!demoOpen)} aria-label="Demo controls" className="mx-auto flex min-h-6 w-16 items-center justify-center">
          <span className="h-1.5 w-12 rounded-full bg-ink/25" />
        </button>
        <div className="flex items-center gap-3">
          <button onClick={p.onStop} aria-label="End trip" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-ink/20">
            <Icon name="close" className="h-7 w-7" />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <p className={`font-display text-3xl leading-none font-bold ${p.halted ? "text-danger" : "text-green-dark"}`}>{p.halted ? "Stop" : duration(p.remainingHours)}</p>
            <p className="mt-1 truncate text-sm text-muted">
              {p.halted ? `Road closed · wait at ${p.stopPlace}` : `${p.remainingKm} km · ${arrivalClock(now, p.remainingHours)}`}
            </p>
          </div>
          <Link href="/sos" aria-label="SOS emergency" className="flex h-14 min-w-[88px] items-center justify-center rounded-full bg-danger px-4 font-display text-xl font-bold text-white shadow-md">
            SOS
          </Link>
        </div>
        {demoOpen && (
          <div className="mt-3 flex flex-col gap-2">
            <p className="text-center text-xs text-muted">{p.gps ? "Live GPS" : "Demo drive (simulation, not live GPS)"}</p>
            <div className="grid grid-cols-3 gap-2">
              {(["jam", "ai", "closure"] as const).map((k) => (
                <button key={k} onClick={() => p.onDemo(k)} className="min-h-11 rounded-xl border-2 border-dashed border-ink/40 px-2 text-sm font-semibold">
                  Demo: {k === "jam" ? "jam" : k === "ai" ? "AI risk" : "landslide"}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
