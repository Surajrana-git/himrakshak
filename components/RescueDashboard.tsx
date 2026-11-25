"use client";

import { useEffect, useRef, useState } from "react";
import { LngLatBounds, Map as MapLibreMap, Marker, setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { supabase } from "@/lib/supabase";
import { useSosCalls, type SosCall } from "@/lib/sos";
import { REPORT_KINDS, timeAgo, useReports, type Report } from "@/lib/reports";
import { iconElement, REPORT_ICONS } from "@/lib/report-icons";

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
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markers = useRef<Marker[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!container.current) return;
    const map = new MapLibreMap({ container: container.current, style: MAP_STYLE, bounds: UTTARAKHAND, attributionControl: { compact: true } });
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

  return (
    <div className="flex h-dvh flex-col md:flex-row">
      <aside className="flex max-h-[50dvh] flex-col gap-4 overflow-y-auto bg-ink p-4 text-snow md:max-h-none md:w-[400px]">
        <header>
          <p className="font-display text-xs uppercase tracking-[0.2em] text-orange">Himrakshak · Rescue room</p>
          <h1 className="font-display text-3xl">Live SOS and road reports</h1>
          <p className="text-sm opacity-80">Updates instantly. SOS sent by SMS (no data) reaches the phone it was sent to, not this screen.</p>
        </header>

        {!supabase && (
          <p className="rounded-xl bg-danger p-3 text-sm">Not connected: Supabase keys are missing in .env.local, so nothing can arrive here yet.</p>
        )}

        <section>
          <h2 className="font-display text-xl">SOS · last 24 h ({sos.length})</h2>
          {sos.length === 0 && <p className="mt-1 text-sm opacity-80">No SOS calls.</p>}
          <ul className="mt-2 flex flex-col gap-2">
            {sos.map((c) => (
              <li key={c.id}>
                <button onClick={() => focus(c)} className="flex min-h-12 w-full flex-col rounded-xl bg-danger p-3 text-left">
                  <span className="font-semibold">{c.message ?? "SOS (no message)"}</span>
                  <span className="text-sm">
                    {timeAgo(c.created_at)} · {c.lat.toFixed(4)}, {c.lon.toFixed(4)}
                    {c.accuracy_m !== null ? ` · ±${Math.round(c.accuracy_m)} m` : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="font-display text-xl">Driver reports · last 48 h ({reports.length})</h2>
          <ul className="mt-2 flex flex-col divide-y divide-snow/15">
            {reports.slice(0, 30).map((r) => (
              <li key={r.id} className="py-2 text-sm">
                <span className="font-semibold">{REPORT_KINDS[r.kind].label}</span> · {timeAgo(r.created_at)}
                {r.note ? ` · ${r.note}` : ""}
              </li>
            ))}
          </ul>
        </section>
      </aside>
      <div ref={container} className="min-h-[50dvh] flex-1" aria-label="Rescue map" />
    </div>
  );
}
