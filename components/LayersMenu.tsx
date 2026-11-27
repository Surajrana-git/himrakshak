import type { BaseMap } from "@/components/RiskMap";

export type DataLayer = "risk" | "traffic" | "lakes";

type Props = { base: BaseMap; data: DataLayer; onBase: (b: BaseMap) => void; onData: (d: DataLayer) => void; onClose: () => void };

const BASES: [BaseMap, string][] = [
  ["standard", "Standard"],
  ["satellite", "Satellite"],
  ["terrain", "Terrain"],
];
const DATA: [DataLayer, string][] = [
  ["risk", "खतरा · Risk"],
  ["traffic", "ट्रैफिक · Traffic"],
  ["lakes", "झील · Lakes"],
];

function Choice<T extends string>({ title, items, value, onPick }: { title: string; items: [T, string][]; value: T; onPick: (v: T) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-muted">{title}</legend>
      <div className="grid grid-cols-3 gap-2">
        {items.map(([id, label]) => (
          <button key={id} onClick={() => onPick(id)} aria-pressed={value === id} className={`min-h-12 rounded-2xl border-2 px-2 text-sm font-semibold ${value === id ? "border-green bg-mint text-green-dark" : "border-ink/10"}`}>
            {label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export default function LayersMenu({ base, data, onBase, onData, onClose }: Props) {
  return (
    <div className="animate-fade fixed inset-0 z-40 flex items-end bg-ink/30 md:items-center md:justify-center" onClick={onClose}>
      <div role="dialog" aria-label="Map layers" onClick={(e) => e.stopPropagation()} className="animate-sheet flex w-full flex-col gap-4 rounded-t-3xl bg-white p-5 pb-[max(20px,env(safe-area-inset-bottom))] md:max-w-sm md:rounded-3xl">
        <h2 className="font-display text-xl font-bold">Map layers</h2>
        <Choice title="Map type" items={BASES} value={base} onPick={onBase} />
        <Choice title="Road data" items={DATA} value={data} onPick={onData} />
        <button onClick={onClose} className="min-h-12 rounded-full bg-green font-semibold text-white">
          Done
        </button>
      </div>
    </div>
  );
}
