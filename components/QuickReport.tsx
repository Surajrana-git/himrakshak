"use client";

import { useState } from "react";
import ReportIcon from "@/components/ReportIcon";
import { createReport, REPORT_KINDS, type ReportKind } from "@/lib/reports";
import { nearestSegment } from "@/lib/geo";

type Props = {
  at: { lat: number; lon: number };
  segments: { id: string; coordinates: number[][] }[];
  onSent: (label: string) => void;
  onMore: () => void;
  onClose: () => void;
};

// Waze-style: while driving, one tap on a big icon sends the report from where the car is.
export default function QuickReport({ at, segments, onSent, onMore, onClose }: Props) {
  const [sending, setSending] = useState<ReportKind | null>(null);
  const [error, setError] = useState("");

  async function send(kind: ReportKind) {
    setSending(kind);
    setError("");
    try {
      const segment_id = nearestSegment(at.lat, at.lon, segments).id;
      await createReport({ segment_id, kind, note: null, lat: at.lat, lon: at.lon, photo: null });
      navigator.vibrate?.(80);
      onSent(REPORT_KINDS[kind].label);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Report was not sent");
      setSending(null);
    }
  }

  return (
    <div className="animate-fade fixed inset-0 z-40 flex items-end bg-ink/50 md:items-center md:justify-center" onClick={onClose}>
      <section
        role="dialog"
        aria-label="Quick report"
        onClick={(e) => e.stopPropagation()}
        className="animate-sheet flex w-full flex-col gap-4 rounded-t-3xl bg-white p-5 pb-[max(20px,env(safe-area-inset-bottom))] md:max-w-md md:rounded-3xl"
      >
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold">What do you see?</h2>
            <p className="text-sm text-muted">One tap sends it from where you are now.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ink/10">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        <div className="grid grid-cols-3 gap-x-2 gap-y-4">
          {(Object.keys(REPORT_KINDS) as ReportKind[]).map((k) => (
            <button key={k} onClick={() => send(k)} disabled={sending !== null} className="flex flex-col items-center gap-1 text-center disabled:opacity-50">
              <span className={`flex h-20 w-20 items-center justify-center rounded-full shadow-md ${REPORT_KINDS[k].fill} ${sending === k ? "animate-pulse" : ""}`}>
                <ReportIcon kind={k} className="h-11 w-11" />
              </span>
              <span className="text-sm leading-tight font-semibold">{sending === k ? "Sending…" : REPORT_KINDS[k].label}</span>
            </button>
          ))}
        </div>

        {error && <p className="text-sm font-semibold text-danger">{error}</p>}

        <button onClick={onMore} className="min-h-12 rounded-full border-2 border-green font-semibold text-green-dark">
          Add a photo or details
        </button>
      </section>
    </div>
  );
}
