import ReportIcon from "@/components/ReportIcon";
import { REPORT_KINDS, type ReportKind } from "@/lib/reports";

// Every map symbol written out in words too, so colour is never the only clue.
export default function MapLegend({ pastSlideCount }: { pastSlideCount: number }) {
  return (
    <section>
      <h2 className="font-display text-xl">Map key</h2>
      <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
        {(Object.keys(REPORT_KINDS) as ReportKind[]).map((k) => (
          <li key={k} className="flex items-center gap-2">
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${REPORT_KINDS[k].fill}`}>
              <ReportIcon kind={k} className="h-5 w-5" />
            </span>
            <span>
              {REPORT_KINDS[k].label}
            </span>
          </li>
        ))}
        <li className="col-span-2 flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-danger bg-snow text-danger">
            <ReportIcon kind="landslide" className="h-5 w-5" />
          </span>
          <span>Recent news (Google News, updated hourly)</span>
        </li>
        <li className="col-span-2 flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-orange">
            <ReportIcon kind="landslide" className="h-5 w-5" />
          </span>
          <span>
            Purane landslides · Past landslides ({pastSlideCount}, NASA record 2007–2017)
          </span>
        </li>
      </ul>
      <p className="mt-2 text-xs text-muted">If a driver added a photo, the pin shows it. Tap to see it larger.</p>
    </section>
  );
}
