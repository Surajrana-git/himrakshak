"use client";

import { useEffect, useRef, useState } from "react";
import { LngLatBounds, Map as MapLibreMap, Marker, setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { supabase } from "@/lib/supabase";
import { useSosCalls, type SosCall } from "@/lib/sos";
import Link from "next/link";
import { confirmedBlocks, REPORT_KINDS, timeAgo, useReports, type Report } from "@/lib/reports";
import { iconElement, REPORT_ICONS } from "@/lib/report-icons";
import { googlePlaceUrl } from "@/lib/google-maps";

setWorkerUrl("/maplibre-gl-worker.mjs");

const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const UTTARAKHAND: [number, number, number, number] = [77.6, 29.4, 80.6, 31.5];

function sosPin(): HTMLElement {
  const pin = document.createElement("div");
  pin.className = "flex h-11 w-11 items-center justify-center rounded-full border-4 border-snow bg-danger font-display text-sm text-snow shadow-xl";
  pin.textContent = "SOS";
  return pin;
}

function reportPin(report: Report): HTMLElement {
  const pin = document.createElement("div");
  pin.className = `flex h-9 w-9 items-center justify-center rounded-full border-2 border-snow shadow-lg ${REPORT_KINDS[report.kind].fill}`;
  pin.append(iconElement(REPORT_ICONS[report.kind], 20));
  return pin;
}

// Rescue room view (English is fine here): every SOS and driver report on one live map.
export default function RescueDashboard() {
  const sos = useSosCalls();
  const reports = useReports();
  const container = useRef<HTMLDivElement>(null); // phone: map between the counts and the lists
  const desktop = useRef<HTMLDivElement>(null); // wide screen: map beside the lists
  const mapRef = useRef<MapLibreMap | null>(null);
  const markers = useRef<Marker[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const box = window.matchMedia("(min-width: 768px)").matches ? desktop.current : container.current;
    if (!box) return;
    const map = new MapLibreMap({ container: box, style: MAP_STYLE, bounds: UTTARAKHAND, attributionControl: { compact: true } });
    mapRef.current = map;
    map.on("load", () => setLoaded(true));
    return () => map.remove();
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!loaded || !map) return;
    markers.current.forEach((m) => m.remove());
    markers.current = [
      ...reports.map((r) => new Marker({ element: reportPin(r) }).setLngLat([r.lon, r.lat]).addTo(map)),
      // SOS last, so it sits on top.
      ...sos.map((c) => new Marker({ element: sosPin() }).setLngLat([c.lon, c.lat]).addTo(map)),
    ];
  }, [loaded, sos, reports]);

  function focus(call: SosCall) {
    const map = mapRef.current;
    if (!map) return;
    map.fitBounds(new LngLatBounds([call.lon, call.lat], [call.lon, call.lat]), { maxZoom: 14, padding: 80, duration: 800 });
  }

  // Reports load in the browser (none at build time, where the clock must not be read).
  const closed = reports.length ? confirmedBlocks(reports) : [];
  return (
    <div className="flex min-h-dvh flex-col md:h-dvh md:flex-row">
      <aside className="flex flex-col gap-4 bg-ink p-4 pt-[max(16px,env(safe-area-inset-top))] text-snow md:w-[420px] md:overflow-y-auto">
        <header className="flex items-start gap-3">
          <Link href="/" aria-label="Back to map" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-snow/10">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M19 12H5M11 6l-6 6 6 6" />
            </svg>
          </Link>
          <div>
            <p className="font-display text-xs tracking-[0.2em] text-orange uppercase">Himrakshak · Rescue room</p>
            <h1 className="font-display text-2xl leading-tight">Live SOS and road reports</h1>
          </div>
        </header>

        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            [sos.length, "SOS · 24 h", "bg-danger"],
            [reports.length, "Reports · 48 h", "bg-snow/10"],
            [closed.length, "Roads closed", "bg-orange text-ink"],
          ].map(([n, label, cls]) => (
            <div key={label as string} className={`rounded-2xl p-3 ${cls}`}>
              <p className="font-display text-3xl leading-none font-bold">{n}</p>
              <p className="mt-1 text-xs font-semibold">{label}</p>
            </div>
          ))}
        </div>
        <p className="text-xs opacity-70">Updates instantly. SOS arrives by internet, by the SMS gateway, or carried by a phone over Bluetooth.</p>

        {!supabase && <p className="rounded-xl bg-danger p-3 text-sm">Not connected: Supabase keys are missing, so nothing can arrive here yet.</p>}

        <div ref={container} className="h-[42dvh] overflow-hidden rounded-2xl md:hidden" aria-label="Rescue map" />

        <section>
          <h2 className="font-display text-lg">SOS calls</h2>
          {sos.length === 0 && <p className="mt-1 text-sm opacity-80">No SOS calls in the last 24 hours.</p>}
          <ul className="mt-2 flex flex-col gap-2">
            {sos.map((c) => {
              const { title, via } = sosLabel(c.message);
              return (
                <li key={c.id} className="rounded-2xl bg-danger p-3">
                  <button onClick={() => focus(c)} className="flex w-full flex-col text-left">
                    <span className="flex items-center gap-2 font-semibold">
                      {title}
                      {via && <span className="rounded-full bg-snow/20 px-2 text-xs">via {via}</span>}
                    </span>
                    <span className="text-sm opacity-90">
                      {clock(c.created_at)} · {timeAgo(c.created_at)}
                    </span>
                    <span className="text-xs opacity-80">
                      {c.lat.toFixed(4)}, {c.lon.toFixed(4)}
                      {c.accuracy_m !== null ? ` · ±${Math.round(c.accuracy_m)} m` : ""}
                    </span>
                  </button>
                  <a href={googlePlaceUrl(c.lat, c.lon)} target="_blank" rel="noopener noreferrer" className="mt-2 flex min-h-10 items-center justify-center rounded-full bg-snow font-semibold text-danger">
                    Navigate to this SOS
                  </a>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="pb-6">
          <h2 className="font-display text-lg">Driver reports</h2>
          {reports.length === 0 && <p className="mt-1 text-sm opacity-80">No reports in the last 48 hours.</p>}
          <ul className="mt-2 flex flex-col divide-y divide-snow/15">
            {reports.slice(0, 30).map((r) => (
              <li key={r.id} className="flex items-center gap-2 py-2 text-sm">
                <span className={`h-3 w-3 shrink-0 rounded-full ${REPORT_KINDS[r.kind].fill}`} />
                <span>
                  <b>{REPORT_KINDS[r.kind].label}</b> · {timeAgo(r.created_at)}
                  {r.note ? ` · ${r.note}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </aside>
      <div ref={desktop} className="hidden flex-1 md:block" aria-label="Rescue map" />
    </div>
  );
}

// "Injured · sent 2026-11-28T07:37:18.000Z · via app" → "Injured", "app".
function sosLabel(message: string | null): { title: string; via: string | null } {
  if (!message) return { title: "SOS", via: null };
  const via = message.match(/via (app|sms|mesh)/)?.[1] ?? null;
  return { title: message.split(" · ")[0], via: via === "mesh" ? "Bluetooth" : via === "sms" ? "SMS" : via };
}

const clock = (iso: string) => new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", hour: "numeric", minute: "2-digit" });
