"use client";

import { useState } from "react";
import { digipin } from "@/lib/digipin";
import { getGpsFix, type GpsFix } from "@/lib/sos";
import { googlePlaceUrl } from "@/lib/google-maps";
import { REPORT_KINDS, timeAgo, type Report } from "@/lib/reports";

type Action = "add" | "fix" | "post" | "events" | "camera" | "pin" | "digipin";

const TILES: { id: Action; label: string; path: string }[] = [
  { id: "add", label: "Add a Place", path: "M12 21s6-5.4 6-10.5a6 6 0 0 0-12 0C6 15.6 12 21 12 21zM12 7.5v6M9 10.5h6" },
  { id: "fix", label: "Fix Map", path: "M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" },
  { id: "post", label: "Post on Map", path: "M5 4h14v12H9l-4 4zM9 9h6M9 12h4" },
  { id: "events", label: "View Posted Events", path: "M4 6h16v14H4zM4 10h16M8 3v5M16 3v5M8 14h3" },
  { id: "camera", label: "Maps Camera", path: "M4 8h3l2-3h6l2 3h3v11H4zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" },
  { id: "pin", label: "Get Maps Pin", path: "M12 3a4 4 0 0 1 1 7.9V21h-2V10.9A4 4 0 0 1 12 3z" },
  { id: "digipin", label: "Digipin", path: "M12 3a5 5 0 0 1 1 9.9V21h-2v-8.1A5 5 0 0 1 12 3zM8 21h8" },
];

type Props = {
  reports: Report[];
  canReport: boolean;
  onReport: () => void; // opens the camera report form (Post on Map, Maps Camera)
  onClose: () => void;
};

// The "+" sheet: everything a traveller can add to or take from the map.
export default function QuickActions({ reports, canReport, onReport, onClose }: Props) {
  const [open, setOpen] = useState<Action | null>(null);
  const [fix, setFix] = useState<GpsFix | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function locate(): Promise<GpsFix | null> {
    setError(null);
    try {
      const f = await getGpsFix();
      setFix(f);
      return f;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Location nahi mili");
      return null;
    }
  }

  async function tap(id: Action) {
    if (id === "post" || id === "camera") {
      if (canReport) onReport();
      else setError("Report server set nahi hai (Supabase keys).");
      return;
    }
    setOpen(id);
    if (id !== "events") {
      const f = await locate();
      // OpenStreetMap is the map everyone sees, so new places and fixes go there for real.
      if (f && id === "add") window.open(`https://www.openstreetmap.org/note/new#map=18/${f.lat}/${f.lon}`, "_blank", "noopener");
      if (f && id === "fix") window.open(`https://www.openstreetmap.org/edit#map=18/${f.lat}/${f.lon}`, "_blank", "noopener");
    }
  }

  async function share(text: string) {
    if (navigator.share) {
      await navigator.share({ text }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    }
  }

  const code = fix ? digipin(fix.lat, fix.lon) : null;

  return (
    <section className="animate-sheet absolute inset-x-0 bottom-0 z-20 flex max-h-[70dvh] flex-col rounded-t-3xl bg-white pb-28 shadow-[0_-8px_24px_rgba(20,35,31,0.18)]" aria-label="Quick actions">
      <button onClick={onClose} aria-label="Band karein / Close" className="flex min-h-10 shrink-0 items-center justify-center">
        <span className="h-1.5 w-12 rounded-full bg-ink/25" />
      </button>
      <div className="overflow-y-auto px-4">
        {open === null || open === "add" || open === "fix" ? (
          <ul className="grid grid-cols-4 gap-x-2 gap-y-4">
            {TILES.map((t) => (
              <li key={t.id}>
                <button onClick={() => tap(t.id)} className="flex w-full flex-col items-center gap-1.5 text-center text-xs font-medium">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-mint text-green">
                    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d={t.path} />
                    </svg>
                  </span>
                  {t.label}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <button onClick={() => setOpen(null)} className="mb-3 min-h-10 font-semibold text-green">
            ← Sab options / All actions
          </button>
        )}

        {(open === "add" || open === "fix") && (
          <p className="mt-4 rounded-2xl bg-mint p-3 text-sm">
            {open === "add" ? "Nayi jagah OpenStreetMap par note ke roop mein jodi jaati hai" : "Galat sadak ya jagah OpenStreetMap editor mein theek hoti hai"} — wahi map yahan dikhta hai, isliye sudhaar sabko milta hai. Naya tab khula hai.
          </p>
        )}

        {open === "events" && (
          <section>
            <h2 className="font-display text-lg font-semibold">Posted events · पिछले 48 घंटे</h2>
            {reports.length === 0 && <p className="mt-1 text-sm text-muted">Abhi koi report nahi aayi.</p>}
            <ul className="mt-2 flex flex-col divide-y divide-ink/10">
              {reports.slice(0, 30).map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-2 text-sm">
                  <span className={`h-3 w-3 shrink-0 rounded-full ${REPORT_KINDS[r.kind].fill}`} />
                  <span className="min-w-0 flex-1">
                    <b>{REPORT_KINDS[r.kind].hindi} · {REPORT_KINDS[r.kind].label}</b> · {timeAgo(r.created_at)}
                    {r.note ? <span className="block truncate text-muted">{r.note}</span> : null}
                  </span>
                  {r.photo_url && (
                    <a href={r.photo_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-green underline">
                      Photo
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {(open === "pin" || open === "digipin") && (
          <section className="flex flex-col gap-3">
            <h2 className="font-display text-lg font-semibold">{open === "pin" ? "Meri location ka pin / Your pin" : "DIGIPIN (India Post)"}</h2>
            {!fix && !error && <p className="text-sm text-muted">Location dhoondh rahe hain…</p>}
            {fix && (
              <>
                <p className="rounded-2xl bg-mint p-4 text-center font-display text-2xl font-semibold tracking-wide text-green-dark">
                  {open === "pin" ? `${fix.lat.toFixed(5)}, ${fix.lon.toFixed(5)}` : (code ?? "India ke bahar")}
                </p>
                <p className="text-center text-xs text-muted">±{fix.accuracy} m GPS accuracy{open === "digipin" ? " · DIGIPIN = ~4 m ka box, India Post ka open standard" : ""}</p>
                <button
                  onClick={() => share(open === "pin" ? `Meri location: ${googlePlaceUrl(fix.lat, fix.lon)}` : `Mera DIGIPIN: ${code}`)}
                  className="min-h-12 rounded-full bg-green font-semibold text-white"
                >
                  {copied ? "Copy ho gaya / Copied" : "Share karein"}
                </button>
              </>
            )}
          </section>
        )}
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      </div>
    </section>
  );
}
