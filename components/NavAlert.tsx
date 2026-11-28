import { getSettings } from "@/lib/settings";
import { playSiren } from "@/lib/siren";
import { useEffect, useRef, useState } from "react";
import ReportIcon from "@/components/ReportIcon";
import type { TripAlert } from "@/lib/trip";
import type { RouteOption } from "@/lib/routes";

type Props = {
  alert: TripAlert;
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

export default function NavAlert({ alert, stopPlace, onResolve }: Props) {
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

  const title = isJam ? "Traffic jam ahead" : kind === "ai" ? "High landslide risk ahead" : noWayAround ? "Road closed: stop" : "Landslide: road closed ahead";
  const line = !ready
    ? "Finding another route…"
    : alert.failed
      ? "Cannot find a new route right now."
      : isJam
        ? fastest
          ? `Other route ${fastest.hours} h · ${fastest.km} km`
          : "No faster route. Stay on this road."
        : noWayAround
          ? soft
            ? "No other route. Drive slowly, watch for falling rocks."
            : `No other route. Wait at ${stopPlace}.`
          : safest
            ? `Safer route: ${safest.hours} h · ${safest.km} km`
            : "";

  // A slim card at the top, under the turn arrow, so most of the road stays in view.
  return (
    <div role="alertdialog" aria-live="assertive" className={`rounded-2xl p-3 shadow-xl ${soft ? "bg-orange text-ink" : "bg-danger text-snow"}`}>
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-snow text-ink">
          <ReportIcon kind={isJam ? "jam" : "landslide"} className="h-7 w-7" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg leading-tight font-bold">
            {title} · {alert.kmAhead} km
          </p>
          <p className="truncate text-sm">{line}</p>
        </div>
      </div>
      {ready && (
        <div className="mt-2 flex gap-2">
          {isJam && fastest && (
            <button onClick={() => resolve(fastest)} className="min-h-11 flex-1 rounded-full bg-ink text-sm font-semibold text-snow">
              Other route
            </button>
          )}
          {!isJam && safest && soft && (
            <button onClick={() => resolve(safest)} className="min-h-11 flex-1 rounded-full bg-ink text-sm font-semibold text-snow">
              Safer route
            </button>
          )}
          <button onClick={() => resolve(soft ? null : safest)} className="min-h-11 flex-1 rounded-full bg-snow text-sm font-semibold text-ink">
            {soft ? "Stay" : safest ? "Take safer route" : "OK, I will stop"} · {left}s
          </button>
        </div>
      )}
    </div>
  );
}
