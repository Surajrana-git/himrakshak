import { RISK_STYLE } from "@/lib/risk";
import type { MapSegment } from "@/components/RiskMap";

type Props = {
  segments: MapSegment[];
  focusId: string | null;
  onSelect: (id: string | null) => void;
};

// Ride-app style trip view: towns as stops, each stretch between them coloured by risk.
export default function TripTimeline({ segments, focusId, onSelect }: Props) {
  const totalKm = Math.round(segments.reduce((sum, s) => sum + s.distanceKm, 0));
  const last = segments[segments.length - 1];

  return (
    <section>
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-xl">Aapka safar / Your trip</h2>
        <p className="text-sm text-muted">{totalKm} km</p>
      </div>
      <ol className="mt-3">
        {segments.map((s) => {
          const style = RISK_STYLE[s.level];
          const focused = s.id === focusId;
          return (
            <li key={s.id}>
              <Stop name={s.from} />
              <button
                onClick={() => onSelect(focused ? null : s.id)}
                aria-pressed={focused}
                className={`flex w-full items-stretch gap-3 rounded-xl text-left ${focused ? "bg-ink/10" : ""}`}
              >
                <span className="flex w-6 shrink-0 justify-center">
                  <span className="w-1.5 rounded-full" style={{ backgroundColor: style.color }} />
                </span>
                <span className="flex min-h-14 flex-1 items-center justify-between gap-2 py-2 pr-2">
                  <span className="text-sm text-muted">{s.distanceKm} km</span>
                  <span className="rounded-full px-3 py-1 text-sm font-semibold" style={{ backgroundColor: style.color, color: style.text }}>
                    {style.hindi} · {style.label} · {s.score}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
        <li>
          <Stop name={last.to} />
        </li>
      </ol>
    </section>
  );
}

function Stop({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex w-6 justify-center">
        <span className="h-4 w-4 rounded-full border-[3px] border-ink bg-snow" />
      </span>
      <span className="font-semibold">{name}</span>
    </div>
  );
}
