type Props = {
  segments: { id: string; from: string; to: string }[];
  closedId: string | null;
  onChange: (segmentId: string | null) => void;
};

// Lets judges close any stretch and watch the app find a way around it.
export default function ClosureSimulator({ segments, closedId, onChange }: Props) {
  return (
    <details className="rounded-2xl border-2 border-dashed border-ink/30 p-4">
      <summary className="min-h-8 cursor-pointer font-display text-lg">Demo: close a road</summary>
      <p className="text-sm text-muted">
        Simulation only. In real use, a road counts as closed when 2 drivers report a block within 1 km.
      </p>
      <label className="mt-3 flex flex-col gap-1">
        <span className="font-semibold">Which stretch is closed?</span>
        <select
          value={closedId ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          className="min-h-12 rounded-xl border-2 border-ink/20 bg-snow px-3"
        >
          <option value="">None</option>
          {segments.map((s) => (
            <option key={s.id} value={s.id}>
              {s.from} → {s.to}
            </option>
          ))}
        </select>
      </label>
    </details>
  );
}
