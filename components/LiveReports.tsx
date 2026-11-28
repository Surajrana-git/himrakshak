import ReportIcon from "@/components/ReportIcon";
import { OFF_HIGHWAY, REPORT_KINDS, timeAgo, type Report } from "@/lib/reports";
import { nearestPlace } from "@/lib/trip";

type Props = { reports: Report[]; segmentName: (id: string) => string };

export default function LiveReports({ reports, segmentName }: Props) {
  if (reports.length === 0) return null;
  return (
    <section>
      <h2 className="font-display text-xl">Live reports</h2>
      <ul className="mt-2 divide-y divide-ink/15">
        {reports.slice(0, 8).map((r) => (
          <li key={r.id} className="flex gap-3 py-3">
            {r.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={r.photo_url} alt="Report photo" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
            ) : (
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${REPORT_KINDS[r.kind].fill}`}>
                <ReportIcon kind={r.kind} />
              </span>
            )}
            <div>
              <p className="font-semibold">
                {REPORT_KINDS[r.kind].label}
              </p>
              <p className="text-sm text-muted">
                {r.segment_id === OFF_HIGHWAY ? `Near ${nearestPlace(r).name}` : segmentName(r.segment_id)} · {timeAgo(r.created_at)}
                {r.ai_verdict && r.ai_verdict !== "unclear" && (
                  <span className="ml-1 font-semibold">
                    · AI photo check: {r.ai_verdict === "blocked" ? "road looks blocked" : "road looks open"} ({Math.round((r.ai_confidence ?? 0) * 100)}%)
                  </span>
                )}
              </p>
              {r.note && <p className="mt-1">{r.note}</p>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
