"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import RiskMap, { type BaseMap, type MapSegment } from "@/components/RiskMap";
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
import TripPlanner from "@/components/TripPlanner";
import NavPanel from "@/components/NavPanel";
import TurnBanner from "@/components/TurnBanner";
import NavAlert from "@/components/NavAlert";
import LakeCard from "@/components/LakeCard";
import ReportIcon from "@/components/ReportIcon";
import SearchBar from "@/components/SearchBar";
import SideMenu from "@/components/SideMenu";
import LayersMenu, { type DataLayer } from "@/components/LayersMenu";
import BottomNav, { type Tab } from "@/components/BottomNav";
import QuickActions from "@/components/QuickActions";
import SavesScreen from "@/components/SavesScreen";
import PlacesScreen from "@/components/PlacesScreen";
import PermissionPrompt from "@/components/PermissionPrompt";
import NewsCard from "@/components/NewsCard";
import { isGuest, useAuth } from "@/lib/auth";
import { useSavedPlaces } from "@/lib/saved-places";
import lakesData from "@/data/glacial-lakes.json";
import { nearestPlace, useTrip, type Hazard } from "@/lib/trip";
import { confirmedBlocks, recentJams, useReports } from "@/lib/reports";
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
  const [layer, setLayer] = useState<DataLayer>("risk");
  const [baseMap, setBaseMap] = useState<BaseMap>("standard");
  const [northSignal, setNorthSignal] = useState(0);
  const [focusPoint, setFocusPoint] = useState<{ lat: number; lon: number } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("home");
  const [plusOpen, setPlusOpen] = useState(false);
  const [shareNote, setShareNote] = useState<string | null>(null);
  const auth = useAuth();
  const saved = useSavedPlaces(auth.user?.id ?? null);
  const [lakeId, setLakeId] = useState<string | null>(null);
  const selectedLake = lakesData.lakes.find((l) => l.id === lakeId) ?? null;
  // Fit the camera to the lake and the road below it, so the link to the route is visible.
  const lakeLine = useMemo(
    () => (selectedLake ? [[selectedLake.lon, selectedLake.lat], [selectedLake.roadPoint.lon, selectedLake.roadPoint.lat]] : null),
    [selectedLake],
  );
  const [detourSignal, setDetourSignal] = useState(0);
  const [detourResult, setDetourResult] = useState<{ key: string; detour: Detour | null; failed: boolean } | null>(null);
  const online = useOnline();
  const router = useRouter();

  // First open: sign in or choose guest. Guests keep the full map, SOS and reports.
  useEffect(() => {
    if (auth.ready && !auth.user && !isGuest()) router.replace("/login");
  }, [auth.ready, auth.user, router]);

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

  // Hazards the trip watches for: closed spots, and jams drivers reported in the last 2 hours.
  const knownHazards = useMemo(() => {
    const list: Hazard[] = closures.map((c) => ({ id: `closure-${c.lat.toFixed(3)},${c.lon.toFixed(3)}`, kind: "closure", lat: c.lat, lon: c.lon }));
    for (const r of recentJams(reports)) list.push({ id: r.id, kind: "jam", lat: r.lat, lon: r.lon });
    return list;
  }, [closures, reports]);
  const trip = useTrip(knownHazards, storm);
  const mapClosures = useMemo(
    () => [...closures, ...trip.demoHazards.filter((h) => h.kind === "closure")],
    [closures, trip.demoHazards],
  );
  const mapJams = useMemo(() => trip.demoHazards.filter((h) => h.kind === "jam"), [trip.demoHazards]);
  const tripLines = useMemo(() => {
    if (trip.stage === "nav" && trip.active) return [{ id: "active", coordinates: trip.active.coordinates, selected: true }];
    if (trip.stage === "plan" && trip.options) {
      return trip.options.map((o) => ({ id: o.id, coordinates: o.coordinates, selected: o.id === trip.selected?.id }));
    }
    return [];
  }, [trip.stage, trip.active, trip.options, trip.selected]);
  const stopPlace = trip.car ? nearestPlace(trip.car) : null;

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
    if (layer !== "traffic") {
      const r = RISK_STYLE[s.level];
      return { ...s, display: { color: r.color, text: r.text, label: `${r.label} · ${s.score}` } };
    }
    const flow = traffic?.enabled ? traffic.flows[i] : null;
    const t = TRAFFIC_STYLE[trafficLevel(s.id, closures.some((c) => c.segmentId === s.id), flow, reports)];
    const speed = flow && !flow.closed ? ` · ${flow.currentKmh} km/h` : "";
    return { ...s, display: { color: t.color, text: t.text, label: `${t.label}${speed}` } };
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
          closures={mapClosures}
          jams={mapJams}
          detour={closureKey && trip.stage === "idle" ? detourLine : null}
          detourSignal={detourSignal}
          tripLines={tripLines}
          fitLine={trip.stage === "plan" ? (trip.selected?.coordinates ?? null) : layer === "lakes" ? lakeLine : null}
          car={trip.stage === "nav" ? trip.car : null}
          junction={trip.stage === "nav" ? trip.junction : null}
          lakes={layer === "lakes" ? lakesData.lakes : NO_LAKES}
          onSelectLake={(id) => {
            setLakeId(id);
            setSheetOpen(true);
          }}
          towns={route.towns}
          reports={reports}
          focusId={focusId}
          onSelectSegment={selectSegment}
          locateSignal={locateSignal}
          fitSignal={fitSignal}
          baseMap={baseMap}
          northSignal={northSignal}
          focusPoint={focusPoint}
        />
      </div>

      {/* Search-bar style route header, like a maps app */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-2 px-3 pt-[max(12px,env(safe-area-inset-top))] md:inset-x-auto md:left-4 md:w-[400px] md:px-0 md:pt-4">
        {trip.stage === "idle" ? (
          <SearchBar
            onMenu={() => setMenuOpen(true)}
            onPick={(place) => {
              trip.setTo(place);
              trip.openPlanner();
            }}
            onDirections={trip.openPlanner}
          />
        ) : (
        <div className="pointer-events-auto flex min-h-14 items-center gap-3 rounded-full bg-white py-2 pr-2 pl-2 shadow-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.png" alt="" className="h-10 w-10 rounded-full bg-white object-contain" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-lg leading-tight">
                {trip.from.name} → {trip.to?.name ?? "…"}
              </p>
              <p className="truncate text-xs text-muted">{trip.stage === "nav" ? "Navigating" : "Choose a route"}</p>
            </div>
          <span
            className="shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold"
            style={{ backgroundColor: worstStyle.color, color: worstStyle.text }}
          >
            {worstStyle.label}
          </span>
        </div>
        )}
        {trip.stage === "idle" && (
          <span
            className="pointer-events-auto self-start rounded-full px-3 py-1.5 text-sm font-semibold shadow-md"
            style={{ backgroundColor: worstStyle.color, color: worstStyle.text }}
          >
            Badrinath highway: {worstStyle.label}
          </span>
        )}
        {trip.stage === "nav" && trip.turn && <TurnBanner turn={trip.turn} />}
        {trip.stage === "nav" && !trip.arrived && (
          <div
            role="status"
            className={`pointer-events-auto flex items-center gap-3 rounded-2xl p-3 shadow-lg ${
              trip.ahead ? (trip.ahead.hazard.kind === "jam" ? "bg-orange text-ink" : "bg-danger text-snow") : "bg-ink text-snow"
            }`}
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-snow text-ink">
              <ReportIcon kind={trip.ahead ? (trip.ahead.hazard.kind === "jam" ? "jam" : "road_blocked") : "clear"} className="h-8 w-8" />
            </span>
            <span className="min-w-0">
              <span className="block font-display text-2xl leading-tight">
                {trip.ahead ? `${trip.ahead.hazard.kind === "jam" ? "Jam" : "Road closed"} in ${trip.ahead.kmAhead} km` : "Road ahead is clear"}
              </span>
              <span className="block text-sm opacity-80">
                {trip.ahead ? "Reported by drivers" : "No reported hazard on your route"}
              </span>
            </span>
          </div>
        )}
        {!online && (
          <p className="pointer-events-auto rounded-full bg-ink px-4 py-2 text-sm text-snow shadow-lg">
            Offline: showing the last saved data
          </p>
        )}
      </header>

      {trip.alert && (
        <div className="absolute inset-x-3 top-[76px] z-30 max-h-[calc(100dvh-96px)] overflow-y-auto md:right-auto md:left-[432px] md:w-[400px]">
          <NavAlert
            key={trip.alert.hazard.id}
            alert={trip.alert}
            current={{ km: trip.remainingKm, hours: trip.remainingHours }}
            stopPlace={stopPlace?.name ?? "the last town"}
            onResolve={trip.resolveAlert}
          />
        </div>
      )}

      {/* Floating map buttons: SOS always on top, then the design's green stack */}
      <div className="absolute top-[124px] right-3 z-10 flex flex-col gap-2 md:top-4 md:right-4">
        <Link
          href="/sos"
          aria-label="SOS emergency help"
          className="flex h-13 w-13 items-center justify-center rounded-full border-4 border-white bg-danger font-display text-base font-bold text-white shadow-xl"
        >
          SOS
        </Link>
        {trip.stage !== "nav" && (
          <MapButton label="Map layers" onClick={() => setLayersOpen(true)}>
            <path d="M12 3 3 8l9 5 9-5-9-5zM3 13l9 5 9-5M3 17.5l9 5 9-5" />
          </MapButton>
        )}
        <MapButton label="Reset north" onClick={() => setNorthSignal((n) => n + 1)}>
          <circle cx="12" cy="12" r="9" />
          <path d="m12 5 3 7h-6zM12 19l-3-7h6z" fill="currentColor" />
        </MapButton>
        {supabase && (
          <MapButton label="Photo report" onClick={() => setReporting(true)}>
            <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
            <circle cx="12" cy="13" r="3.5" />
          </MapButton>
        )}
        <MapButton
          label="Share location"
          onClick={async () => {
            const text = `Himrakshak · Badrinath highway now: ${worstStyle.label}. ${window.location.origin}`;
            if (navigator.share) await navigator.share({ text }).catch(() => {});
            else {
              await navigator.clipboard.writeText(text);
              setShareNote("Link copied");
              setTimeout(() => setShareNote(null), 2500);
            }
          }}
        >
          <circle cx="6" cy="12" r="2.5" />
          <circle cx="18" cy="6" r="2.5" />
          <circle cx="18" cy="18" r="2.5" />
          <path d="m8.2 10.9 7.6-3.8M8.2 13.1l7.6 3.8" />
        </MapButton>
        <MapButton label="My location" onClick={() => setLocateSignal((n) => n + 1)}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
        </MapButton>
      </div>
      {shareNote && (
        <p role="status" className="animate-fade absolute top-[132px] left-3 z-30 rounded-full bg-ink px-4 py-2 text-sm text-white">
          {shareNote}
        </p>
      )}

      {/* Bottom sheet on phones, side panel on desktop */}
      <section
        hidden={trip.stage === "idle" && (tab !== "home" || plusOpen)}
        className={`absolute inset-x-0 bottom-0 z-20 flex flex-col rounded-t-3xl bg-white shadow-[0_-8px_24px_rgba(20,35,31,0.18)] transition-[max-height] duration-300 ${
          trip.stage === "plan" ? "max-h-[58dvh]" : sheetOpen ? "max-h-[85dvh]" : trip.stage === "idle" ? "max-h-[36dvh]" : "max-h-[44dvh]"
        } md:inset-x-auto md:top-[144px] md:bottom-4 md:left-4 md:max-h-none md:w-[400px] md:rounded-3xl md:shadow-lg`}
        aria-label="Trip details"
      >
        <button
          onClick={() => setSheetOpen(!sheetOpen)}
          aria-label={sheetOpen ? "Collapse" : "Expand"}
          aria-expanded={sheetOpen}
          className="flex min-h-10 shrink-0 items-center justify-center md:hidden"
        >
          <span className="h-1.5 w-12 rounded-full bg-ink/25" />
        </button>

        <div className={`flex flex-col gap-5 overflow-y-auto px-4 md:pt-4 ${trip.stage === "idle" ? "pb-28" : "pb-[max(24px,env(safe-area-inset-bottom))]"}`}>
          {trip.stage === "plan" && (
            <TripPlanner
              from={trip.from}
              to={trip.to}
              options={trip.options}
              loading={trip.planLoading}
              failed={trip.planFailed}
              selected={trip.selected}
              avoidsClosures={mapClosures.length > 0}
              onFrom={trip.setFrom}
              onTo={trip.setTo}
              onPick={trip.pick}
              onStart={trip.start}
              onClose={trip.close}
            />
          )}
          {trip.stage === "nav" && (
            <NavPanel
              destination={trip.to ? trip.to.name : ""}
              remainingKm={trip.remainingKm}
              remainingHours={trip.remainingHours}
              gps={trip.gps}
              arrived={trip.arrived}
              halted={trip.halted}
              stopPlace={stopPlace ? stopPlace.name : "the last town"}
              onDemo={trip.demoHazard}
              onReport={supabase ? () => setReporting(true) : null}
              onStop={trip.close}
            />
          )}
          {trip.stage === "idle" && layer === "lakes" && (
            <section className="flex flex-col gap-3">
              <h2 className="font-display text-xl">Glacier jheel · Glacial lakes above the roads</h2>
              {lakesData.lakes.map((lake) => (
                <LakeCard key={lake.id} lake={lake} selected={lake.id === lakeId} onSelect={() => setLakeId(lake.id === lakeId ? null : lake.id)} />
              ))}
            </section>
          )}
          {trip.stage === "idle" && (
          <>
          <NewsCard news={news} />
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
            <p className="text-sm text-muted">Reports are off: Supabase keys are missing in `.env.local`.</p>
          )}

          {layer === "traffic" && !traffic?.enabled && (
            <p className="text-sm text-muted">
              Traffic: live speeds are off (no TOMTOM_API_KEY). Showing driver jam reports only.
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

          </>
          )}

          <footer className="text-xs text-muted">
            Live rain: Open-Meteo · Updated {rain.times[rain.nowIndex]?.replace("T", " ")} IST · Roads: OpenStreetMap · Past landslides: NASA Global Landslide Catalog · Detours: Valhalla (OpenStreetMap)
          </footer>
        </div>
      </section>

      {trip.stage === "idle" && (
        <BottomNav
          tab={tab}
          plusOpen={plusOpen}
          onTab={(t) => {
            setPlusOpen(false);
            // Home again: recentre on the whole route.
            if (t === "home" && tab === "home") {
              setFocusId(null);
              setFitSignal((n) => n + 1);
            }
            setTab(t);
          }}
          onPlus={() => setPlusOpen(!plusOpen)}
        />
      )}
      {trip.stage === "idle" && plusOpen && (
        <QuickActions reports={reports} canReport={Boolean(supabase)} onReport={() => setReporting(true)} onClose={() => setPlusOpen(false)} />
      )}
      {trip.stage === "idle" && !plusOpen && tab === "saves" && (
        <SavesScreen
          signedIn={Boolean(auth.user)}
          places={saved.places}
          error={saved.error}
          onSave={saved.save}
          onRemove={saved.remove}
          onShow={(p) => setFocusPoint({ lat: p.lat, lon: p.lon })}
          onClose={() => setTab("home")}
        />
      )}
      {trip.stage === "idle" && !plusOpen && tab === "places" && (
        <PlacesScreen
          onShow={(p) => setFocusPoint({ lat: p.lat, lon: p.lon })}
          onRoute={(p) => {
            setTab("home");
            trip.setTo(p);
            trip.openPlanner();
          }}
          onSave={auth.user ? (p) => saved.save({ list_name: "Favourites", name: p.name, lat: p.lat, lon: p.lon }) : null}
          onClose={() => setTab("home")}
        />
      )}
      {menuOpen && (
        <SideMenu
          user={auth.user}
          onLakes={() => {
            setMenuOpen(false);
            setLayer("lakes");
            setSheetOpen(true);
          }}
          onReport={() => {
            setMenuOpen(false);
            setReporting(true);
          }}
          onClose={() => setMenuOpen(false)}
        />
      )}
      {layersOpen && <LayersMenu base={baseMap} data={layer} onBase={setBaseMap} onData={setLayer} onClose={() => setLayersOpen(false)} />}
      <PermissionPrompt />
      {reporting && <ReportForm segments={route.segments} onClose={() => setReporting(false)} />}
    </div>
  );
}

// Stable empty list so the map doesn't redraw news pins on every render.
const NO_NEWS: SlideNewsFeed["items"] = [];
const NO_LAKES: typeof lakesData.lakes = [];

function MapButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-12 w-12 items-center justify-center rounded-full bg-green text-white shadow-lg"
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
