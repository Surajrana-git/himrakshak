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
// Landslide: longer, and when time runs out the safest way around is taken.
const JAM_SECONDS = 5;
const CLOSURE_SECONDS = 12;

function speak(text: string) {
  if (!("speechSynthesis" in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "hi-IN";
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

export default function NavAlert({ alert, current, stopPlace, onResolve }: Props) {
  const isJam = alert.hazard.kind === "jam";
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
    speak(isJam ? `Aage ${alert.kmAhead} kilometre par jaam hai.` : `Saavdhaan. Aage ${alert.kmAhead} kilometre par bhooskhalan. Rasta band hai.`);
  }, [isJam, alert.kmAhead]);

  // The countdown starts once the new routes are in, so the driver always sees the choices.
  useEffect(() => {
    if (!ready) return;
    const timer = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [ready]);

  useEffect(() => {
    if (left > 0) return;
    // No answer: jam → stay on this road; landslide → safest way around, or stop if there is none.
    resolve(isJam ? null : safest);
  });

  const noWayAround = ready && options.length === 0;

  return (
    <div role="alertdialog" aria-live="assertive" className={`rounded-3xl p-4 shadow-2xl ${isJam ? "bg-orange text-ink" : "bg-danger text-snow"}`}>
      <div className="flex items-center gap-3">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-snow text-ink">
          <ReportIcon kind={isJam ? "jam" : "landslide"} className="h-9 w-9" />
        </span>
        <div>
          <p className="font-display text-xs uppercase tracking-[0.2em]">
            {isJam ? "Traffic jam ahead" : "Landslide ahead"} · {alert.kmAhead} km
          </p>
          <p className="font-display text-3xl leading-tight">{isJam ? "आगे जाम है" : "रास्ता बंद है"}</p>
        </div>
      </div>

      {!ready && <p className="mt-2">Doosra rasta dhoondh rahe hain…</p>}
      {alert.failed && <p className="mt-2">Naya rasta abhi nahi mil raha (routing server).</p>}

      {isJam && ready && fastest && (
        <p className="mt-2">
          Doosra rasta: {fastest.hours} ghante · {fastest.km} km. Abhi wala: {current.hours} ghante · {current.km} km (jaam ka samay alag).
        </p>
      )}
      {isJam && noWayAround && <p className="mt-2">Koi doosra rasta nahi. Dheere aur dhyan se chalein.</p>}

      {!isJam && noWayAround && (
        <p className="mt-2">
          Koi doosra rasta nahi hai. Aage na jaayein — {stopPlace} mein rukein aur rasta khulne ka intezaar karein.
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
              Doosra rasta lein
            </button>
          )}
          <button onClick={() => resolve(isJam ? null : safest)} className="min-h-12 rounded-full bg-snow font-semibold text-ink">
            {isJam ? "Isi raste pe rahein" : safest ? "Sabse surakshit rasta lein" : "Theek hai, rukta hoon"}
          </button>
          <div className="h-1.5 overflow-hidden rounded-full bg-ink/20" aria-hidden>
            <div className="h-full bg-snow transition-[width] duration-1000 ease-linear" style={{ width: `${(left / seconds) * 100}%` }} />
          </div>
          <p className="text-xs">
            {left} s{isJam ? " · jawab na dene par isi raste pe rahenge" : safest ? " · jawab na dene par sabse surakshit rasta chuna jaayega" : ""}
          </p>
        </div>
      )}
    </div>
  );
}
