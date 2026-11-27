import type lakesData from "@/data/glacial-lakes.json";

export type Lake = (typeof lakesData)["lakes"][number];

type Props = { lake: Lake; selected: boolean; onSelect: () => void };

// Predict: a real glacial lake and how it grew, with the number written on every bar.
export default function LakeCard({ lake, selected, onSelect }: Props) {
  const max = Math.max(...lake.areas.map((a) => a.km2), 0);
  return (
    <section className={`rounded-2xl border-[3px] p-3 ${selected ? "border-ink" : "border-ink/15"}`}>
      <button onClick={onSelect} aria-pressed={selected} className="flex min-h-12 w-full flex-col items-start text-left">
        <span className="font-display text-xs tracking-[0.2em] text-orange-dark uppercase">
          {lake.status === "history" ? "2013 · What happened" : "Predict · Glacial lake"} · {lake.elevationM} m
        </span>
        <span className="font-display text-2xl leading-tight">{lake.name}</span>
      </button>

      {lake.areas.length > 0 && (
        <figure className="mt-2">
          <div className="flex h-28 items-end gap-2 border-b-2 border-ink" role="img" aria-label={`Area: ${lake.areas.map((a) => `${a.year} ${a.km2} km²`).join(", ")}`}>
            {lake.areas.map((a, i) => {
              const last = i === lake.areas.length - 1;
              return (
                <div key={a.year} className="flex flex-1 flex-col items-center justify-end gap-0.5">
                  <span className="text-xs font-semibold">{a.km2}</span>
                  <span className={`w-full rounded-t ${last ? "bg-danger" : "bg-teal"}`} style={{ height: `${(a.km2 / max) * 80}px` }} />
                </div>
              );
            })}
          </div>
          <div className="mt-1 flex gap-2">
            {lake.areas.map((a) => (
              <span key={a.year} className="flex-1 text-center text-xs text-muted">
                {a.year}
              </span>
            ))}
          </div>
          <figcaption className="mt-1 text-xs text-muted">km² · {lake.areaSource}</figcaption>
        </figure>
      )}

      <p className="mt-2 font-semibold">{lake.growth}</p>
      {selected && (
        <div className="mt-2 flex flex-col gap-1.5 text-sm">
          <p>{lake.fieldNote}</p>
          <p>
            <span className="font-semibold">Risk: </span>
            {lake.risk}
          </p>
          <p>
            <span className="font-semibold">Downstream: </span>
            {lake.downstream}
          </p>
          <p className="flex flex-wrap gap-x-3 text-xs">
            {lake.sources.map((s) => (
              <a key={s} href={s} target="_blank" rel="noopener noreferrer" className="underline">
                {new URL(s).hostname}
              </a>
            ))}
          </p>
        </div>
      )}
      <p className="mt-2 text-xs text-muted">Satellite estimates. This is a watch, not a flood warning.</p>
    </section>
  );
}
