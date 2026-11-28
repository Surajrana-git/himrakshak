import { getSettings } from "@/lib/settings";
import { playSiren } from "@/lib/siren";
import { useEffect, useRef, useState } from "react";
import RouteOptionCard from "@/components/RouteOptionCard";
import ReportIcon from "@/components/ReportIcon";
import type { TripAlert } from "@/lib/trip";
import type { RouteOption } from "@/lib/routes";

type Props = {
  alert: TripAlert;
  current: { km: number; hours: number };
  stopPlace: string;
  onResolve: (option: RouteOption | null) => void;
};

// Jam: a short heads-up, staying on the route is the default.
// Landslide (road closed): longer, and when time runs out the safest way around is taken.
// AI warning (road open, slides likely): longer, safer routes offered, staying is the default.
const JAM_SECONDS = 5;
const CLOSURE_SECONDS = 12;

function speak(text: string) {
  if (!("speechSynthesis" in window) || !getSettings().voice) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-IN";
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

export default function NavAlert({ alert, current, stopPlace, onResolve }: Props) {
  const kind = alert.hazard.kind;
  const isJam = kind === "jam";
  // Jam and AI warnings leave the road open, so doing nothing keeps the driver on it.
  const soft = kind !== "closure";
  const seconds = isJam ? JAM_SECONDS : CLOSURE_SECONDS;
  const ready = alert.options !== null || alert.failed;
  const options = alert.options ?? [];
  const safest = options.find((o) => o.safest) ?? options[0] ?? null;
  const fastest = options.find((o) => o.fastest) ?? null;
  const [left, setLeft] = useState(seconds);
  const resolved = useRef(false);

  function resolve(option: RouteOption | null) {
    if (resolved.current) return;
    resolved.current = true;
    onResolve(option);
  }

  useEffect(() => {
    // A buzz the driver feels even with the sound off: longer for a closed road.
    if (getSettings().vibrate) navigator.vibrate?.(kind === "closure" ? [400, 150, 400, 150, 400] : [250, 120, 250]);
    if (kind !== "jam") playSiren(); // danger only: a jam is a nuisance, not a threat
    speak(
      kind === "jam"
        ? `Traffic jam ${alert.kmAhead} kilometres ahead.`
        : kind === "ai"
          ? `Caution. High landslide risk ${alert.kmAhead} kilometres ahead after heavy rain. A safer route may be available.`
          : `Warning. Landslide ${alert.kmAhead} kilometres ahead. The road is closed.`,
    );
  }, [kind, alert.kmAhead]);

  // The countdown starts once the new routes are in, so the driver always sees the choices.
  useEffect(() => {
    if (!ready) return;
    const timer = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [ready]);

  useEffect(() => {
    if (left > 0) return;
    // No answer: jam → stay on this road; landslide → safest way around, or stop if there is none.
    resolve(soft ? null : safest);
  });

  const noWayAround = ready && options.length === 0;

  return (
    <div role="alertdialog" aria-live="assertive" className={`rounded-3xl p-4 shadow-2xl ${soft ? "bg-orange text-ink" : "bg-danger text-snow"}`}>
      <div className="flex items-center gap-3">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-snow text-ink">
          <ReportIcon kind={isJam ? "jam" : "landslide"} className="h-9 w-9" />
        </span>
        <div>
          <p className="font-display text-xs uppercase tracking-[0.2em]">
            {isJam ? "Traffic jam ahead" : kind === "ai" ? "AI landslide warning" : "Landslide ahead"} · {alert.kmAhead} km
          </p>
          <p className="font-display text-3xl leading-tight">{isJam ? "Jam ahead" : kind === "ai" ? "High risk ahead" : "Road closed"}</p>
        </div>
      </div>

      {kind === "ai" && <p className="mt-2">Heavy rain makes slides likely on this stretch today. The road is still open.</p>}
      {!ready && <p className="mt-2">Finding another route…</p>}
      {alert.failed && <p className="mt-2">Cannot find a new route right now (routing server).</p>}

      {isJam && ready && fastest && (
        <p className="mt-2">
          Other route: {fastest.hours} h · {fastest.km} km. Current: {current.hours} h · {current.km} km (plus jam delay).
        </p>
      )}
      {soft && noWayAround && <p className="mt-2">No other route. Drive slowly and watch for falling rocks.</p>}

      {kind === "closure" && noWayAround && (
        <p className="mt-2">
          There is no other route. Do not go ahead: stop at {stopPlace} and wait for the road to reopen.
        </p>
      )}
      {!isJam && options.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2 text-ink">
          {options.map((o) => (
            <li key={o.id}>
              <RouteOptionCard option={o} selected={o.id === safest?.id} onSelect={() => resolve(o)} />
            </li>
          ))}
        </ul>
      )}

      {ready && (
        <div className="mt-3 flex flex-col gap-2">
          {isJam && fastest && (
            <button onClick={() => resolve(fastest)} className="min-h-12 rounded-full bg-ink font-semibold text-snow">
              Take other route
            </button>
          )}
          <button onClick={() => resolve(soft ? null : safest)} className="min-h-12 rounded-full bg-snow font-semibold text-ink">
            {soft ? "Stay on this route" : safest ? "Take the safest route" : "OK, I will stop"}
          </button>
          <div className="h-1.5 overflow-hidden rounded-full bg-ink/20" aria-hidden>
            <div className="h-full bg-snow transition-[width] duration-1000 ease-linear" style={{ width: `${(left / seconds) * 100}%` }} />
          </div>
          <p className="text-xs">
            {left} s{soft ? " · no answer keeps this route" : safest ? " · no answer picks the safest route" : ""}
          </p>
        </div>
      )}
    </div>
  );
}
