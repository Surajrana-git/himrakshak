import { useEffect, useRef } from "react";
import type { Turn } from "@/lib/trip";

// Valhalla maneuver types → arrow angle (0 = straight up, 90 = right).
const ANGLE: Record<number, number> = {
  9: 45, 10: 90, 11: 135, 12: 180, 13: 180, 14: -135, 15: -90, 16: -45,
  18: 45, 19: -45, 20: 45, 21: -45, 23: 30, 24: -30,
};
// Ramps, exits, forks, roundabouts, sharp and U-turns: the places drivers get confused.
const COMPLEX = [11, 12, 13, 14, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27];
const ARRIVE = [4, 5, 6];
const SPEAK_AT_M = [500, 200, 30];

function distanceText(metres: number): string {
  if (metres >= 1000) return `${(metres / 1000).toFixed(1)} km`;
  return `${Math.max(0, Math.round(metres / 10) * 10)} मी`;
}

// Google-Maps-style next-turn card with a distance countdown and Hindi voice at 500 m, 200 m and the turn.
export default function TurnBanner({ turn }: { turn: Turn }) {
  const { maneuver, metres } = turn;
  const roundabout = maneuver.type === 26 || maneuver.type === 27;
  const complex = COMPLEX.includes(maneuver.type);

  const spoken = useRef<string>("");
  const threshold = SPEAK_AT_M.find((m) => metres <= m && metres > (SPEAK_AT_M[SPEAK_AT_M.indexOf(m) + 1] ?? -1));
  useEffect(() => {
    if (threshold === undefined || !("speechSynthesis" in window)) return;
    const key = `${maneuver.lat},${maneuver.lon}@${threshold}`;
    if (spoken.current === key) return;
    spoken.current = key;
    const prefix = threshold > 30 ? `${threshold} मीटर में, ` : "";
    const say = new SpeechSynthesisUtterance(prefix + maneuver.text);
    say.lang = "hi-IN";
    speechSynthesis.speak(say);
  }, [threshold, maneuver]);

  return (
    <div role="status" className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-teal p-3 text-ink shadow-lg">
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-ink text-snow">
        {ARRIVE.includes(maneuver.type) ? (
          <svg viewBox="0 0 24 24" className="h-9 w-9" fill="currentColor" aria-hidden>
            <path d="M5 2h2v20H5zM8 3h11l-3 4 3 4H8z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-10 w-10" style={{ transform: `rotate(${ANGLE[maneuver.type] ?? 0}deg)` }} aria-hidden>
            <path d="M12 2 5 10h4.5v12h5V10H19z" fill="currentColor" />
          </svg>
        )}
      </span>
      <span className="min-w-0">
        <span className="block font-display text-3xl leading-none">{distanceText(metres)}</span>
        <span className="block font-semibold leading-snug">{maneuver.text}</span>
        {(complex || roundabout) && (
          <span className="mt-1 inline-block rounded-full bg-ink px-2 py-0.5 text-xs text-snow">
            {roundabout && maneuver.exit ? `गोल चक्कर: ${maneuver.exit}वां निकास · ` : ""}जटिल जंक्शन / Complex junction
          </span>
        )}
      </span>
    </div>
  );
}
