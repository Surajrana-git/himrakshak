import { RISK_STYLE } from "@/lib/risk";
import type { RouteOption } from "@/lib/routes";

type Props = { option: RouteOption; selected: boolean; onSelect: () => void };

// One route choice, like a maps app: label chips, via roads, distance, time and risk in words.
export default function RouteOptionCard({ option, selected, onSelect }: Props) {
  const risk = RISK_STYLE[option.level];
  const via = option.roads.slice(1, 4).join(" → ") || option.roads[0] || "";
  return (
    <button
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex w-full flex-col gap-1 rounded-2xl border-[3px] p-3 text-left ${selected ? "border-ink bg-snow" : "border-ink/15 bg-snow/60"}`}
    >
      <span className="flex flex-wrap gap-1.5">
        {option.safest && <span className="rounded-full bg-teal px-2.5 py-0.5 text-xs font-bold text-ink">Safest</span>}
        {option.fastest && <span className="rounded-full bg-ink px-2.5 py-0.5 text-xs font-bold text-snow">Fastest</span>}
      </span>
      <span className="font-display text-2xl leading-tight">
        {option.hours} h · {option.km} km
      </span>
      {via && <span className="text-sm text-muted">via {via}</span>}
      <span className="text-sm text-muted">
        {option.steepestDeg === null ? "Slope unknown" : `Steepest hills ${Math.round(option.steepestDeg)}°`} ·{" "}
        {option.pastSlides === 0 ? "no past slides recorded" : `${option.pastSlides} past slide${option.pastSlides === 1 ? "" : "s"} near the road`}
      </span>
      <span className="self-start rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ backgroundColor: risk.color, color: risk.text }}>
        {risk.label} · {option.risk}
      </span>
    </button>
  );
}
