"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import RiskMap, { type MapSegment } from "@/components/RiskMap";
import ReportForm from "@/components/ReportForm";
import SafeTimeCard from "@/components/SafeTimeCard";
import TripTimeline from "@/components/TripTimeline";
import LiveReports from "@/components/LiveReports";
import StormSimulator from "@/components/StormSimulator";
import InstallButton from "@/components/InstallButton";
import MapLegend from "@/components/MapLegend";
import RecentNews from "@/components/RecentNews";
import RerouteCard from "@/components/RerouteCard";
import ClosureSimulator from "@/components/ClosureSimulator";
import { confirmedBlocks, useReports } from "@/lib/reports";
import { supabase } from "@/lib/supabase";
import { RISK_STYLE, riskLevel, safeDepartureHour, segmentScore, withSimulatedStorm } from "@/lib/risk";
import type { RainSeries } from "@/lib/weather";
import type { SlideNewsFeed } from "@/lib/slide-news";
import type { Detour } from "@/lib/detour";
import type { TrafficFeed } from "@/lib/traffic";
import { TRAFFIC_STYLE, trafficLevel } from "@/lib/traffic-status";
import type route from "@/data/route-badrinath.json";
import pastLandslides from "@/data/landslides-badrinath.json";

type Props = { route: typeof route; rain: RainSeries; news: SlideNewsFeed | null; traffic: TrafficFeed | null };

export default function RiskView({ route, rain, news, traffic }: Props) {
  const reports = useReports();
  const [reporting, setReporting] = useState(false);
  const [storm, setStorm] = useState({ mmPerHour: 0, hours: 3 });
  const [focusId, setFocusId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [locateSignal, setLocateSignal] = useState(0);
  const [fitSignal, setFitSignal] = useState(0);
  const [demoClosedId, setDemoClosedId] = useState<string | null>(null);
  const [layer, setLayer] = useState<"risk" | "traffic">("risk");
  const [detourSignal, setDetourSignal] = useState(0);
  const [detourResult, setDetourResult] = useState<{ key: string; detour: Detour | null; failed: boolean } | null>(null);
  const online = useOnline();
  const router = useRouter();

  // The server refreshes rain and news every hour; this pulls the new data into an open screen.
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), 60 * 60 * 1000);
    return () => clearInterval(timer);
  }, [router]);

  const series = withSimulatedStorm(rain.mm, rain.nowIndex, storm.mmPerHour, storm.hours);
  const scored = route.segments.map((s, i) => {
    const score = segmentScore(series[i], rain.nowIndex, s.slopeFactor, s.historyFactor);
    return { id: s.id, from: s.from, to: s.to, distanceKm: s.distanceKm, coordinates: s.coordinates, score, level: riskLevel(score) };
  });
  const worst = scored.reduce((a, b) => (b.score > a.score ? b : a));
  const worstStyle = RISK_STYLE[worst.level];

  const safeHour = safeDepartureHour(series, rain.nowIndex, route.segments);
  const safeTime = safeHour === null ? null : rain.times[rain.nowIndex + safeHour];
  const isTomorrow = safeTime !== null && safeTime.slice(0, 10) !== rain.times[rain.nowIndex].slice(0, 10);
  const safeClock = safeTime === null ? null : `${isTomorrow ? "Kal " : ""}${safeTime.slice(11, 16)}`;

  // Closed spots: confirmed by drivers, plus the one picked in the demo control.
  const closures = useMemo(() => {
    const list = confirmedBlocks(reports).map((b) => ({ lat: b.lat, lon: b.lon, segmentId: b.segmentId }));
    const demo = route.segments.find((s) => s.id === demoClosedId);
    if (demo) {
      const [lon, lat] = demo.coordinates[Math.floor(demo.coordinates.length / 2)];
      list.push({ lat, lon, segmentId: demo.id });
    }
    return list;
  }, [reports, demoClosedId, route.segments]);
  const closureKey = closures.map((c) => `${c.lat.toFixed(4)},${c.lon.toFixed(4)}`).join(";");

  useEffect(() => {
    if (!closureKey) return;
    let stale = false;
    fetch(`/api/reroute?blocks=${closureKey}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`reroute ${res.status}`))))
      .then((detour: Detour) => !stale && setDetourResult({ key: closureKey, detour, failed: false }))
      .catch(() => !stale && setDetourResult({ key: closureKey, detour: null, failed: true }));
    return () => {
      stale = true;
    };
  }, [closureKey]);
  const current = detourResult?.key === closureKey ? detourResult : null;
  const detourLine = current?.detour?.found ? current.detour.coordinates : null;

  // Google-Maps-style layer switch: the same road coloured by landslide risk or by traffic.
  const segments: MapSegment[] = scored.map((s, i) => {
    if (layer === "risk") {
      const r = RISK_STYLE[s.level];
      return { ...s, display: { color: r.color, text: r.text, label: `${r.hindi} · ${r.label} · ${s.score}` } };
    }
    const flow = traffic?.enabled ? traffic.flows[i] : null;
    const t = TRAFFIC_STYLE[trafficLevel(s.id, closures.some((c) => c.segmentId === s.id), flow, reports)];
    const speed = flow && !flow.closed ? ` · ${flow.currentKmh} km/h` : "";
    return { ...s, display: { color: t.color, text: t.text, label: `${t.hindi} · ${t.label}${speed}` } };
  });

  const segmentName = (id: string) => {
    const s = route.segments.find((x) => x.id === id);
    return s ? `${s.from} → ${s.to}` : id;
  };

  function selectSegment(id: string | null) {
    setFocusId(id);
    if (id) setSheetOpen(true);
  }

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-snow text-ink">
      <div className="absolute inset-0">
        <RiskMap
          segments={segments}
          pastSlides={pastLandslides.landslides}
          news={news?.items ?? NO_NEWS}
          closures={closures}
          detour={closureKey ? detourLine : null}
          detourSignal={detourSignal}
          towns={route.towns}
          reports={reports}
          focusId={focusId}
          onSelectSegment={selectSegment}
          locateSignal={locateSignal}
          fitSignal={fitSignal}
        />
      </div>

      {/* Search-bar style route header, like a maps app */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-2 px-3 pt-[max(12px,env(safe-area-inset-top))] md:inset-x-auto md:left-4 md:w-[400px] md:px-0 md:pt-4">
        <div className="pointer-events-auto flex min-h-14 items-center gap-3 rounded-full bg-snow py-2 pr-2 pl-2 shadow-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" className="h-10 w-10 rounded-full" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg leading-tight">Himrakshak</p>
            <p className="truncate text-xs text-muted">{route.name}</p>
          </div>
          <span
            className="shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold"
            style={{ backgroundColor: worstStyle.color, color: worstStyle.text }}
          >
            {worstStyle.label}
          </span>
        </div>
        <div role="radiogroup" aria-label="Map layer" className="pointer-events-auto flex self-start rounded-full bg-snow p-1 shadow-lg">
          {(
            [
              ["risk", "खतरा · Risk"],
              ["traffic", "ट्रैफिक · Traffic"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              role="radio"
              aria-checked={layer === value}
              onClick={() => setLayer(value)}
              className={`min-h-10 rounded-full px-4 text-sm font-semibold ${layer === value ? "bg-ink text-snow" : "text-ink"}`}
            >
              {label}
            </button>
          ))}
        </div>
        {!online && (
          <p className="pointer-events-auto rounded-full bg-ink px-4 py-2 text-sm text-snow shadow-lg">
            Offline: aakhri saved map dikh raha hai / showing last saved data
          </p>
        )}
      </header>

      {/* Floating map buttons */}
      <div className="absolute top-24 right-3 z-10 flex flex-col gap-2 md:top-4 md:right-4">
        <MapButton label="Meri location / My location" onClick={() => setLocateSignal((n) => n + 1)}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
        </MapButton>
        <MapButton
          label="Poora route / Whole route"
          onClick={() => {
            setFocusId(null);
            setFitSignal((n) => n + 1);
          }}
        >
          <path d="M5 19c4-1 3-6 7-7s3-6 7-7" />
          <circle cx="5" cy="19" r="2" />
          <circle cx="19" cy="5" r="2" />
        </MapButton>
      </div>

      {/* Bottom sheet on phones, side panel on desktop */}
      <section
        className={`absolute inset-x-0 bottom-0 z-20 flex flex-col rounded-t-3xl bg-snow shadow-[0_-8px_24px_rgba(20,35,31,0.18)] transition-[max-height] duration-300 ${
          sheetOpen ? "max-h-[85dvh]" : "max-h-[44dvh]"
        } md:inset-x-auto md:top-[144px] md:bottom-4 md:left-4 md:max-h-none md:w-[400px] md:rounded-3xl md:shadow-lg`}
        aria-label="Trip details"
      >
        <button
          onClick={() => setSheetOpen(!sheetOpen)}
          aria-label={sheetOpen ? "Chhota karein / Collapse" : "Aur dekhein / Expand"}
          aria-expanded={sheetOpen}
          className="flex min-h-10 shrink-0 items-center justify-center md:hidden"
        >
          <span className="h-1.5 w-12 rounded-full bg-ink/25" />
        </button>

        <button
          onClick={() => setReporting(true)}
          disabled={!supabase}
          aria-label="Rasta report karein / Report road"
          className="absolute -top-[76px] right-3 flex h-16 w-16 items-center justify-center rounded-full bg-orange text-ink shadow-xl disabled:bg-snow disabled:text-muted md:fixed md:top-auto md:right-6 md:bottom-6"
        >
          <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
            <path d="M12 3 2 20h20L12 3z" />
            <path d="M12 10v4M12 17h.01" />
          </svg>
        </button>

        <div className="flex flex-col gap-5 overflow-y-auto px-4 pb-[max(24px,env(safe-area-inset-bottom))] md:pt-4">
          {closures.length > 0 && (
            <RerouteCard
              closedNames={[...new Set(closures.map((c) => segmentName(c.segmentId)))]}
              detour={current?.detour ?? null}
              failed={current?.failed ?? false}
              onShow={() => setDetourSignal((n) => n + 1)}
            />
          )}
          <SafeTimeCard safeHour={safeHour} safeClock={safeClock} />
          <InstallButton />

          {!supabase && (
            <p className="text-sm text-muted">Reports band hain: Supabase keys `.env.local` mein nahi hain.</p>
          )}

          {layer === "traffic" && !traffic?.enabled && (
            <p className="text-sm text-muted">
              Traffic: live speed band hai (TOMTOM_API_KEY nahi). Sirf driver ki &ldquo;जाम&rdquo; reports dikh rahi hain.
            </p>
          )}
          <TripTimeline segments={segments} focusId={focusId} onSelect={selectSegment} />
          <LiveReports reports={reports} segmentName={segmentName} />
          <RecentNews news={news} />
          <MapLegend pastSlideCount={pastLandslides.landslides.length} />
          <StormSimulator
            mmPerHour={storm.mmPerHour}
            hours={storm.hours}
            onChange={(mmPerHour, hours) => setStorm({ mmPerHour, hours })}
          />

          <ClosureSimulator segments={route.segments} closedId={demoClosedId} onChange={setDemoClosedId} />

          <footer className="text-xs text-muted">
            Live rain: Open-Meteo · Updated {rain.times[rain.nowIndex]?.replace("T", " ")} IST · Roads: OpenStreetMap · Past landslides: NASA Global Landslide Catalog · Detours: Valhalla (OpenStreetMap)
          </footer>
        </div>
      </section>

      {reporting && <ReportForm segments={route.segments} onClose={() => setReporting(false)} />}
    </div>
  );
}

// Stable empty list so the map doesn't redraw news pins on every render.
const NO_NEWS: SlideNewsFeed["items"] = [];

function MapButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-12 w-12 items-center justify-center rounded-full bg-snow text-ink shadow-lg"
    >
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        {children}
      </svg>
    </button>
  );
}

function useOnline(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}
