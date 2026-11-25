import ReportIcon from "@/components/ReportIcon";
import { REPORT_KINDS, timeAgo, type Report } from "@/lib/reports";

type Props = { reports: Report[]; segmentName: (id: string) => string };

export default function LiveReports({ reports, segmentName }: Props) {
  if (reports.length === 0) return null;
  return (
    <section>
      <h2 className="font-display text-xl">Taaza reports / Live reports</h2>
      <ul className="mt-2 divide-y divide-ink/15">
        {reports.slice(0, 8).map((r) => (
          <li key={r.id} className="flex gap-3 py-3">
            {r.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={r.photo_url} alt="Report photo" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
            ) : (
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${r.kind === "clear" ? "bg-teal text-ink" : "bg-danger text-snow"}`}>
                <ReportIcon kind={r.kind} />
              </span>
            )}
            <div>
              <p className="font-semibold">
                {REPORT_KINDS[r.kind].hindi} · {REPORT_KINDS[r.kind].label}
              </p>
              <p className="text-sm text-muted">
                {segmentName(r.segment_id)} · {timeAgo(r.created_at)}
              </p>
              {r.note && <p className="mt-1">{r.note}</p>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
