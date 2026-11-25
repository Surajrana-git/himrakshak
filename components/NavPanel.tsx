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

// The compact card while driving: where to, how long, and the big buttons.
export default function NavPanel({ destination, remainingKm, remainingHours, gps, arrived, halted, stopPlace, onDemo, onReport, onStop }: Props) {
  return (
    <section className="flex flex-col gap-3">
      {arrived ? (
        <div className="rounded-2xl bg-teal p-4 text-ink">
          <p className="font-display text-3xl">Pahunch gaye!</p>
          <p>{destination} · You have arrived.</p>
        </div>
      ) : halted ? (
        <div className="rounded-2xl bg-danger p-4 text-snow">
          <p className="font-display text-2xl">Rasta band — aage na jaayein</p>
          <p>{stopPlace} mein rukein. Rasta khulte hi app batayega.</p>
        </div>
      ) : (
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-sm text-muted">Manzil / Destination</p>
            <p className="font-display text-xl leading-tight">{destination}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-display text-2xl leading-tight whitespace-nowrap">{remainingHours} ghante</p>
            <p className="text-sm text-muted">{remainingKm} km baaki</p>
          </div>
        </div>
      )}

      <p className={`self-start rounded-full px-3 py-1 text-xs font-semibold ${gps ? "bg-teal text-ink" : "border-2 border-dashed border-ink/40"}`}>
        {gps ? "GPS · asli location" : "Demo drive (simulation) · GPS route pe nahi hai"}
      </p>

      {!arrived && !halted && (
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => onDemo("jam")} className="min-h-12 rounded-xl border-2 border-dashed border-ink/40 px-2 text-sm font-semibold">
            Demo: aage jaam
          </button>
          <button onClick={() => onDemo("closure")} className="min-h-12 rounded-xl border-2 border-dashed border-ink/40 px-2 text-sm font-semibold">
            Demo: aage landslide
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {onReport && (
          <button onClick={onReport} className="min-h-12 rounded-xl bg-orange font-semibold text-ink">
            Report karein
          </button>
        )}
        <button onClick={onStop} className={`min-h-12 rounded-xl bg-ink font-semibold text-snow ${onReport ? "" : "col-span-2"}`}>
          Safar band karein
        </button>
      </div>
    </section>
  );
}
