import type { AiDay, AiRiskFeed } from "@/lib/ai-risk";
import model from "@/data/landslide-model.json";

type Props = { feed: AiRiskFeed | null; segmentName: (id: string) => string; onSatellite: (segmentId: string) => void };

const CHIP: Record<AiDay["level"], { className: string; label: string }> = {
  low: { className: "bg-teal text-ink", label: "Low" },
  medium: { className: "bg-orange text-ink", label: "Medium" },
  high: { className: "bg-danger text-white", label: "High" },
};

function Chip({ day }: { day: AiDay }) {
  const c = CHIP[day.level];
  return (
    <span className={`inline-flex min-w-[88px] justify-center rounded-full px-2 py-1 text-xs font-semibold ${c.className}`} title={`Riskier than ${day.percentile}% of days in 2010–2017`}>
      {c.label} · {day.percentile}
    </span>
  );
}

// Second opinion from a model trained on real slides on this road. Shown next to, not instead of, the main risk.
export default function AiRiskCard({ feed, segmentName, onSatellite }: Props) {
  const test = model.evaluation;
  return (
    <section className="rounded-2xl bg-mint p-4">
      <p className="font-display text-xs font-semibold tracking-[0.2em] text-green uppercase">AI landslide check · updates every 30 min</p>
      <h2 className="font-display text-xl font-bold">Trained on NASA landslide records</h2>
      {!feed ? (
        <p className="mt-2 text-sm text-muted">Rain data is unavailable right now, so the AI check is paused.</p>
      ) : (
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="text-left text-muted">
              <th className="pb-1 font-medium">Stretch</th>
              <th className="pb-1 font-medium">Today</th>
              <th className="pb-1 font-medium">Tomorrow</th>
            </tr>
          </thead>
          <tbody>
            {feed.stretches.map((s) => (
              <tr key={s.segmentId} className="border-t border-ink/10">
                <td className="py-1.5 pr-2">
                  <button onClick={() => onSatellite(s.segmentId)} className="min-h-10 text-left underline decoration-green/40 underline-offset-2">
                    {segmentName(s.segmentId)}
                  </button>
                </td>
                <td className="py-1.5">
                  <Chip day={s.today} />
                </td>
                <td className="py-1.5">
                  <Chip day={s.tomorrow} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="mt-2 text-xs text-green-dark">Tap a stretch to see its latest real satellite photo.</p>
      <p className="mt-2 text-xs text-muted">
        Method: NASA LHASA 7-day rainfall index plus a model trained on 2010–2014 slides on this road. Tested on 2015–2017: AUC {test.testAuc}; &ldquo;High&rdquo;
        flagged {test.testSlidesFlaggedHigh} slide days, &ldquo;Medium or High&rdquo; {test.testSlidesFlaggedMediumOrHigh}. The number is how this day&apos;s rain ranks against past days (0–100). A
        guide, not a guarantee.
      </p>
    </section>
  );
}
