import { REPORT_ICONS } from "@/lib/report-icons";
import type { ReportKind } from "@/lib/reports";

export default function ReportIcon({ kind, className = "h-6 w-6" }: { kind: ReportKind; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d={REPORT_ICONS[kind]} fillRule="evenodd" />
    </svg>
  );
}
