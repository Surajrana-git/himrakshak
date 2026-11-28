"use client";

import { useState } from "react";
import ReportIcon from "@/components/ReportIcon";
import { createReport, OFF_HIGHWAY, ON_HIGHWAY_KM, REPORT_KINDS, type ReportKind } from "@/lib/reports";
import { nearestSegment } from "@/lib/geo";
import { currentFix, isFreshCapture, stampPhoto } from "@/lib/geo-photo";

type Segment = { id: string; from: string; to: string; coordinates: number[][]; rainPoint: { lat: number; lon: number } };

type Props = { segments: Segment[]; onClose: () => void };

export default function ReportForm({ segments, onClose }: Props) {
  const [segmentId, setSegmentId] = useState(segments[0].id);
  const [gps, setGps] = useState<{ lat: number; lon: number } | null>(null);
  const [gpsNote, setGpsNote] = useState("");
  const [kind, setKind] = useState<ReportKind>("road_blocked");
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [photoNote, setPhotoNote] = useState<{ text: string; ok: boolean } | null>(null);
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [error, setError] = useState("");

  // Returns the stretch name when the spot is on a watched highway.
  function placeReport(lat: number, lon: number): string | null {
    const nearest = nearestSegment(lat, lon, segments);
    setGps({ lat, lon });
    if (nearest.km <= ON_HIGHWAY_KM) {
      setSegmentId(nearest.id);
      setGpsNote("Stretch picked from your location.");
      const seg = segments.find((s) => s.id === nearest.id);
      return seg ? `Near ${seg.from} → ${seg.to}` : null;
    }
    setSegmentId(OFF_HIGHWAY);
    setGpsNote("Your location is set. It is away from the watched highways, so it is filed under its place name.");
    return null;
  }

  function useMyLocation() {
    setGpsNote("Finding your location…");
    currentFix()
      .then((c) => placeReport(c.latitude, c.longitude))
      .catch(() => setGpsNote("Could not get your location. Pick the stretch below."));
  }

  // Only a photo taken just now with the camera counts, and it is stamped with the GPS spot and time.
  async function takePhoto(file: File | undefined) {
    setPhoto(null);
    setPreview(null);
    setPhotoNote(null);
    if (!file) return;
    if (!isFreshCapture(file)) {
      return setPhotoNote({ text: "Only a photo taken now with the camera is allowed. Gallery photos are rejected.", ok: false });
    }
    setPhotoNote({ text: "Adding location and time to the photo…", ok: true });
    try {
      const c = await currentFix();
      const near = placeReport(c.latitude, c.longitude);
      const stamped = await stampPhoto(file, { lat: c.latitude, lon: c.longitude, accuracyM: c.accuracy, at: new Date(), near });
      setPhoto(stamped);
      setPreview(URL.createObjectURL(stamped));
      setPhotoNote({ text: "Location and time are on the photo. The report uses this location.", ok: true });
    } catch (e) {
      setPhotoNote({ text: e instanceof Error ? e.message : "Could not add the photo", ok: false });
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const point = gps ?? segments.find((s) => s.id === segmentId)?.rainPoint;
    if (!point) return setGpsNote("Tap \"Use my location\" or pick a stretch.");
    setStatus("sending");
    try {
      await createReport({ segment_id: segmentId, kind, note: note.trim() || null, lat: point.lat, lon: point.lon, photo });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Report was not sent");
      setStatus("error");
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/60 md:items-center" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="animate-sheet flex max-h-[92dvh] w-full max-w-lg flex-col gap-5 overflow-y-auto rounded-t-3xl bg-snow p-5 pb-[max(20px,env(safe-area-inset-bottom))] md:rounded-3xl"
        aria-label="Road report"
      >
        <header className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold">Report a road problem</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ink/10">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        <fieldset className="flex flex-col gap-2">
          <legend className="font-semibold">Where</legend>
          <button type="button" onClick={useMyLocation} className="min-h-12 rounded-full border-2 border-green px-4 font-semibold text-green-dark">
            Use my location
          </button>
          {gpsNote && <p className="text-sm text-muted">{gpsNote}</p>}
          <select
            value={segmentId}
            disabled={photo !== null}
            onChange={(e) => {
              setSegmentId(e.target.value);
              setGps(null);
            }}
            className="min-h-12 rounded-full border-2 border-ink/20 bg-white px-4"
          >
            {segmentId === OFF_HIGHWAY && <option value={OFF_HIGHWAY}>My location (off the highways)</option>}
            {segments.map((s) => (
              <option key={s.id} value={s.id}>
                {s.from} → {s.to}
              </option>
            ))}
          </select>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="font-semibold">What happened</legend>
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
                <span className="text-sm leading-tight font-semibold">{REPORT_KINDS[k].label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="flex flex-col gap-2">
          <span className="font-semibold">Photo (optional, camera only)</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => {
              takePhoto(e.target.files?.[0]);
              e.target.value = "";
            }}
            className="peer sr-only"
          />
          <span className="flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink/40 font-semibold peer-focus-visible:ring-4 peer-focus-visible:ring-ink">
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor" aria-hidden>
              <path fillRule="evenodd" d="M8.5 4h7l1.5 2.5H20a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.5a2 2 0 0 1 2-2h3zM12 9a4 4 0 1 0 0 8a4 4 0 1 0 0-8zM12 11a2 2 0 1 1 0 4a2 2 0 1 1 0-4z" />
            </svg>
            {photo ? "Retake photo" : "Take photo"}
          </span>
          {photoNote && <p className={`text-sm ${photoNote.ok ? "text-muted" : "font-semibold text-danger"}`}>{photoNote.text}</p>}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {preview && <img src={preview} alt="Your report photo with location and time" className="rounded-2xl" />}
        </label>

        <label className="flex flex-col gap-2">
          <span className="font-semibold">Anything else? (optional)</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={280}
            rows={2}
            placeholder="E.g. near km 42, one lane open"
            className="rounded-2xl border-2 border-ink/20 bg-white p-3"
          />
        </label>

        {status === "error" && <p className="font-semibold text-danger">{error}</p>}

        <button
          type="submit"
          disabled={status === "sending"}
          className="min-h-14 rounded-full bg-green px-4 font-display text-xl font-semibold text-white disabled:opacity-60"
        >
          {status === "sending" ? "Sending…" : "Send report"}
        </button>
      </form>
    </div>
  );
}
