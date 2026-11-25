import { REPORT_ICONS } from "@/lib/report-icons";
import type { ReportKind } from "@/lib/reports";

export default function ReportIcon({ kind, className = "h-6 w-6" }: { kind: ReportKind; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {REPORT_ICONS[kind].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
