import { useSyncExternalStore } from "react";
import ReportIcon from "@/components/ReportIcon";

type Props = {
  destination: string;
  remainingKm: number;
  remainingHours: number;
  gps: boolean;
  arrived: boolean;
  halted: boolean;
  stopPlace: string;
  onDemo: (kind: "jam" | "closure") => void;
  onReport: (() => void) | null;
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
  return new Date(now + hours * 3600_000).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" });
}

function duration(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return h > 0 ? `${h} घं ${m} मि` : `${m} मि`;
}

// Waze-style driving bar: round report button left, arrival time in the middle, stop right.
export default function NavPanel({ destination, remainingKm, remainingHours, gps, arrived, halted, stopPlace, onDemo, onReport, onStop }: Props) {
  const now = useSyncExternalStore(subscribeClock, clockNow, () => 0);

  if (arrived) {
    return (
      <section className="flex flex-col gap-3">
        <div className="rounded-2xl bg-teal p-4 text-ink">
          <p className="font-display text-3xl">पहुँच गए!</p>
          <p>{destination} · You have arrived.</p>
          <p className="mt-1 text-sm">पहाड़ में जल्दी नहीं, सलामती ज़रूरी.</p>
        </div>
        <button onClick={onStop} className="min-h-14 rounded-full bg-ink font-display text-xl text-snow">
          ठीक है · Done
        </button>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      {halted && (
        <div className="rounded-2xl bg-danger p-4 text-snow">
          <p className="font-display text-2xl">रास्ता बंद — आगे न जाएँ</p>
          <p>{stopPlace} में रुकें. रास्ता खुलते ही ऐप बताएगा.</p>
        </div>
      )}

      <div className="flex items-center gap-3">
        {onReport && (
          <button
            onClick={onReport}
            aria-label="रिपोर्ट करें / Report"
            className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-full bg-orange text-ink shadow-lg"
          >
            <ReportIcon kind="landslide" className="h-8 w-8" />
            <span className="text-[10px] font-bold">रिपोर्ट</span>
          </button>
        )}
        <div className="min-w-0 flex-1 text-center">
          <p className="font-display text-4xl leading-none">{arrivalClock(now, remainingHours)}</p>
          <p className="mt-1 text-sm font-semibold">
            {duration(remainingHours)} · {remainingKm} km
          </p>
          <p className="truncate text-xs text-muted">{destination}</p>
        </div>
        <button
          onClick={onStop}
          aria-label="सफ़र बंद करें / End trip"
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-ink/10 text-ink"
        >
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden>
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>

      <p className={`self-center rounded-full px-3 py-1 text-xs font-semibold ${gps ? "bg-teal text-ink" : "border-2 border-dashed border-ink/40"}`}>
        {gps ? "GPS · असली लोकेशन" : "डेमो यात्रा — असली GPS नहीं · Demo drive (simulation)"}
      </p>

      {!halted && (
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => onDemo("jam")} className="min-h-12 rounded-xl border-2 border-dashed border-ink/40 px-2 text-sm font-semibold">
            डेमो: आगे जाम
          </button>
          <button onClick={() => onDemo("closure")} className="min-h-12 rounded-xl border-2 border-dashed border-ink/40 px-2 text-sm font-semibold">
            डेमो: आगे भूस्खलन
          </button>
        </div>
      )}
    </section>
  );
}
