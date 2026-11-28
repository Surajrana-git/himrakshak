"use client";

import { useEffect, useRef } from "react";
import ReportIcon from "@/components/ReportIcon";
import { REPORT_KINDS, timeAgo, type Report } from "@/lib/reports";

type Props = { report: Report; onAnswer: (stillThere: boolean | null) => void };

const ASK_SECONDS = 20;

// Waze-style check as the car passes a report: drivers on the spot keep the map honest.
// "No" sends a "Road clear" report, which reopens a closure (see confirmedBlocks).
export default function StillThere({ report, onAnswer }: Props) {
  const kind = REPORT_KINDS[report.kind];

  // The parent re-renders as the car moves; the timer must not restart each time.
  const answer = useRef(onAnswer);
  useEffect(() => {
    answer.current = onAnswer;
  });
  useEffect(() => {
    const timer = setTimeout(() => answer.current(null), ASK_SECONDS * 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div role="alertdialog" aria-label="Is it still there?" className="animate-fade pointer-events-auto flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-xl">
      <div className="flex items-center gap-3">
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${kind.fill}`}>
          <ReportIcon kind={report.kind} className="h-8 w-8" />
        </span>
        <div className="min-w-0">
          <p className="font-display text-xl leading-tight font-bold">{kind.label} here?</p>
          <p className="text-sm text-muted">Reported {timeAgo(report.created_at)}. Is it still there?</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => onAnswer(true)} className={`min-h-12 rounded-full font-semibold ${kind.fill}`}>
          Yes, still there
        </button>
        <button onClick={() => onAnswer(false)} className="min-h-12 rounded-full bg-teal font-semibold text-ink">
          No, road clear
        </button>
      </div>
    </div>
  );
}
