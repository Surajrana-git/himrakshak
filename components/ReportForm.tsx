"use client";

import { useState } from "react";
import ReportIcon from "@/components/ReportIcon";
import { createReport, REPORT_KINDS, type ReportKind } from "@/lib/reports";
import { nearestSegment } from "@/lib/geo";

type Segment = { id: string; from: string; to: string; coordinates: number[][]; rainPoint: { lat: number; lon: number } };

type Props = { segments: Segment[]; onClose: () => void };

// GPS further than this from the route is not "on the road": ask the user to pick.
const ON_ROUTE_KM = 5;

export default function ReportForm({ segments, onClose }: Props) {
  const [segmentId, setSegmentId] = useState(segments[0].id);
  const [gps, setGps] = useState<{ lat: number; lon: number } | null>(null);
  const [gpsNote, setGpsNote] = useState("");
  const [kind, setKind] = useState<ReportKind>("road_blocked");
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [error, setError] = useState("");

  function useMyLocation() {
    setGpsNote("Location dhoondh rahe hain…");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const nearest = nearestSegment(coords.latitude, coords.longitude, segments);
        if (nearest.km <= ON_ROUTE_KM) {
          setSegmentId(nearest.id);
          setGps({ lat: coords.latitude, lon: coords.longitude });
          setGpsNote("Aapki location se hissa chun liya.");
        } else {
          setGps(null);
          setGpsNote(`Aap route se ${Math.round(nearest.km)} km door hain. Neeche se hissa chunein.`);
        }
      },
      () => setGpsNote("Location nahi mili. Neeche se hissa chunein."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const segment = segments.find((s) => s.id === segmentId)!;
    const point = gps ?? segment.rainPoint;
    setStatus("sending");
    try {
      await createReport({ segment_id: segmentId, kind, note: note.trim() || null, lat: point.lat, lon: point.lon, photo });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Report nahi gayi");
      setStatus("error");
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-ink/60 md:items-center" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92dvh] w-full max-w-lg flex-col gap-5 overflow-y-auto bg-snow p-5"
        aria-label="Road report"
      >
        <header className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl">Rasta report karein</h2>
            <p className="text-muted">Report a road problem</p>
          </div>
          <button type="button" onClick={onClose} className="min-h-12 px-3 text-lg" aria-label="Close">
            ✕
          </button>
        </header>

        <fieldset className="flex flex-col gap-2">
          <legend className="font-semibold">Kahan? / Where</legend>
          <button type="button" onClick={useMyLocation} className="min-h-12 border-2 border-ink px-4 font-semibold">
            Meri location use karein
          </button>
          {gpsNote && <p className="text-sm text-muted">{gpsNote}</p>}
          <select
            value={segmentId}
            onChange={(e) => {
              setSegmentId(e.target.value);
              setGps(null);
            }}
            className="min-h-12 border-2 border-ink/30 bg-white px-3"
          >
            {segments.map((s) => (
              <option key={s.id} value={s.id}>
                {s.from} → {s.to}
              </option>
            ))}
          </select>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="font-semibold">Kya hua? / What happened</legend>
          {/* Waze-style report menu: big round colour buttons, one tap per hazard. */}
          <div className="grid grid-cols-3 gap-x-2 gap-y-3">
            {(Object.keys(REPORT_KINDS) as ReportKind[]).map((k) => (
              <label key={k} className="flex cursor-pointer flex-col items-center gap-1 text-center">
                <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} className="peer sr-only" />
                <span
                  className={`flex h-[72px] w-[72px] items-center justify-center rounded-full shadow-md ring-offset-2 ring-offset-snow peer-focus-visible:ring-4 peer-focus-visible:ring-ink ${REPORT_KINDS[k].fill} ${
                    kind === k ? "ring-4 ring-ink" : ""
                  }`}
                >
                  <ReportIcon kind={k} className="h-10 w-10" />
                </span>
                <span className="text-sm leading-tight font-semibold">{REPORT_KINDS[k].hindi}</span>
                <span className="text-xs leading-tight text-muted">{REPORT_KINDS[k].label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="flex flex-col gap-2">
          <span className="font-semibold">Photo (optional)</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
            className="peer sr-only"
          />
          <span className="flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink/40 font-semibold peer-focus-visible:ring-4 peer-focus-visible:ring-ink">
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor" aria-hidden>
              <path fillRule="evenodd" d="M8.5 4h7l1.5 2.5H20a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.5a2 2 0 0 1 2-2h3zM12 9a4 4 0 1 0 0 8a4 4 0 1 0 0-8zM12 11a2 2 0 1 1 0 4a2 2 0 1 1 0-4z" />
            </svg>
            {photo ? `Photo li gayi: ${photo.name}` : "Photo lein / Take photo"}
          </span>
        </label>

        <label className="flex flex-col gap-2">
          <span className="font-semibold">Kuch aur? (optional)</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={280}
            rows={2}
            placeholder="Jaise: km 42 ke paas, ek lane khuli hai"
            className="border-2 border-ink/30 bg-white p-3"
          />
        </label>

        {status === "error" && <p className="font-semibold text-danger">{error}</p>}

        <button
          type="submit"
          disabled={status === "sending"}
          className="min-h-14 bg-ink px-4 font-display text-xl tracking-wide text-snow disabled:opacity-60"
        >
          {status === "sending" ? "Bhej rahe hain…" : "Report bhejein"}
        </button>
      </form>
    </div>
  );
}
