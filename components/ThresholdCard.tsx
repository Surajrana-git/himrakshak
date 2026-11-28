import { THRESHOLDS, thresholdRatios } from "@/lib/thresholds";

type Props = { stretches: { id: string; name: string; hourlyMm: number[] }[]; nowIndex: number };

// Second opinion from Indian research: is the rain up to 6 h from now above the rain that
// triggered slides on this road before?
export default function ThresholdCard({ stretches, nowIndex }: Props) {
  const rows = stretches.map((s) => ({ ...s, r: thresholdRatios(s.hourlyMm, nowIndex) }));
  const above = rows.filter((row) => row.r.nh58 >= 1 || row.r.chamoli >= 1);
  const worst = Math.max(...rows.map((row) => Math.max(row.r.nh58, row.r.chamoli)));
  return (
    <section className={`rounded-2xl p-4 ${above.length ? "bg-danger text-white" : "bg-mint"}`}>
      <p className={`font-display text-xs font-semibold tracking-[0.2em] uppercase ${above.length ? "text-white" : "text-green"}`}>
        Indian rainfall thresholds · now + next 6 h
      </p>
      <h2 className="font-display text-xl font-bold">
        {above.length === 0
          ? "Rain is below the slide thresholds"
          : above.length <= 2
            ? `Above the slide threshold on ${above.map((a) => a.name).join(", ")}`
            : `Above the slide threshold on ${above.length} of ${rows.length} stretches`}
      </h2>
      <p className="mt-1 text-sm">
        {above.length
          ? "This much rain has set off landslides on this road before. Avoid these stretches or wait."
          : `The wettest stretch is at ${Math.round(worst * 100)}% of the nearest threshold.`}
      </p>
      <ul className={`mt-2 text-xs ${above.length ? "text-white/85" : "text-muted"}`}>
        {THRESHOLDS.map((t) => (
          <li key={t.id}>
            {t.name}: I = {t.a}·D<sup>{t.b}</sup> mm/h · {t.source}
          </li>
        ))}
      </ul>
    </section>
  );
}
