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
            <span className={`mt-1.5 h-3 w-3 shrink-0 rounded-full ${r.kind === "clear" ? "bg-teal" : "bg-danger"}`} />
            <div>
              <p className="font-semibold">
                {REPORT_KINDS[r.kind].hindi} · {REPORT_KINDS[r.kind].label}
              </p>
              <p className="text-sm text-muted">
                {segmentName(r.segment_id)} · {timeAgo(r.created_at)}
                {r.photo_url ? " · photo" : ""}
              </p>
              {r.note && <p className="mt-1">{r.note}</p>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
