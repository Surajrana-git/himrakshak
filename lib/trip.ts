"use client";

import { useEffect, useMemo, useState } from "react";
import placesData from "@/data/places.json";
import { distanceKm } from "@/lib/geo";
import type { RouteOption, Storm } from "@/lib/routes";
import type { Point } from "@/lib/valhalla";

export type Place = { name: string; hindi: string; lat: number; lon: number; dham: boolean };
export type Hazard = { id: string; kind: "closure" | "jam"; lat: number; lon: number };
export type TripAlert = {
  hazard: Hazard;
  kmAhead: number;
  options: RouteOption[] | null; // null while loading or failed
  failed: boolean;
};

export const PLACES: Place[] = placesData.places;

const ALERT_WITHIN_KM = 30; // heads-up distance, like a maps app
const ON_ROUTE_KM = 1; // a hazard further than this from the line is on another road
const GPS_ON_ROUTE_KM = 2;
// Demo drive: 1 km every 0.4 s, so a 300 km trip plays in about 2 minutes.
const DEMO_KM_PER_TICK = 1;
const DEMO_TICK_MS = 400;

type Fetched = { key: string; options: RouteOption[] | null; failed: boolean };

async function fetchOptions(from: Point, to: Point, closed: Point[], storm: Storm): Promise<RouteOption[]> {
  const params = new URLSearchParams({
    from: `${from.lat},${from.lon}`,
    to: `${to.lat},${to.lon}`,
    storm: `${storm.mmPerHour},${storm.hours}`,
  });
  if (closed.length > 0) params.set("closed", closed.map((c) => `${c.lat},${c.lon}`).join(";"));
  const res = await fetch(`/api/routes?${params}`);
  if (!res.ok) throw new Error(`routes ${res.status}`);
  return (await res.json()).options;
}

function cumulativeKm(coordinates: number[][]): number[] {
  const cum = [0];
  for (let i = 1; i < coordinates.length; i++) {
    const [lon0, lat0] = coordinates[i - 1];
    const [lon, lat] = coordinates[i];
    cum.push(cum[i - 1] + distanceKm(lat0, lon0, lat, lon));
  }
  return cum;
}

function indexAtKm(cum: number[], km: number): number {
  let i = 0;
  while (i < cum.length - 1 && cum[i] < km) i++;
  return i;
}

function nearestIndex(coordinates: number[][], p: Point): { index: number; km: number } {
  let best = { index: 0, km: Infinity };
  coordinates.forEach(([lon, lat], index) => {
    const km = distanceKm(p.lat, p.lon, lat, lon);
    if (km < best.km) best = { index, km };
  });
  return best;
}

// The first not-yet-handled hazard on the route within 30 km ahead of the car.
function firstHazardAhead(
  coordinates: number[][],
  cum: number[],
  carIndex: number,
  hazards: Hazard[],
  handled: Set<string>,
): { hazard: Hazard; kmAhead: number } | null {
  for (const hazard of hazards) {
    if (handled.has(hazard.id)) continue;
    const near = nearestIndex(coordinates, hazard);
    if (near.km > ON_ROUTE_KM || near.index <= carIndex) continue;
    const kmAhead = cum[near.index] - cum[carIndex];
    if (kmAhead <= ALERT_WITHIN_KM) return { hazard, kmAhead: Math.max(1, Math.round(kmAhead)) };
  }
  return null;
}

export function nearestPlace(p: Point): Place {
  return PLACES.reduce((a, b) => (distanceKm(p.lat, p.lon, b.lat, b.lon) < distanceKm(p.lat, p.lon, a.lat, a.lon) ? b : a));
}

// Google-Maps-style trip: plan (route options) → navigate (GPS or demo drive) → alerts for hazards ahead.
export function useTrip(knownHazards: Hazard[], storm: Storm) {
  const [stage, setStage] = useState<"idle" | "plan" | "nav">("idle");
  const [from, setFrom] = useState<Place>(PLACES[0]);
  const [to, setTo] = useState<Place | null>(null);
  const [plan, setPlan] = useState<Fetched | null>(null);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [active, setActive] = useState<RouteOption | null>(null);
  const [progressKm, setProgressKm] = useState(0);
  const [gps, setGps] = useState(false);
  const [halted, setHalted] = useState(false);
  const [demoHazards, setDemoHazards] = useState<Hazard[]>([]);
  const [handled, setHandled] = useState<Set<string>>(new Set());
  const [alertFetch, setAlertFetch] = useState<Fetched | null>(null);

  const hazards = useMemo(() => [...knownHazards, ...demoHazards], [knownHazards, demoHazards]);
  const closed = useMemo(() => hazards.filter((h) => h.kind === "closure"), [hazards]);
  const closedKey = closed.map((c) => `${c.lat.toFixed(3)},${c.lon.toFixed(3)}`).join(";");

  // Route options for the planner. The key holds everything the answer depends on.
  const planKey = stage === "plan" && to ? `${from.lat},${from.lon}>${to.lat},${to.lon}|${closedKey}|${storm.mmPerHour},${storm.hours}` : "";
  useEffect(() => {
    if (!planKey || !to) return;
    let stale = false;
    fetchOptions(from, to, closed, storm)
      .then((options) => !stale && setPlan({ key: planKey, options, failed: false }))
      .catch(() => !stale && setPlan({ key: planKey, options: null, failed: true }));
    return () => {
      stale = true;
    };
    // planKey already covers from, to, closures and storm.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planKey]);
  const planResult = plan?.key === planKey ? plan : null;
  const options = planResult?.options ?? null;
  const selected = options?.find((o) => o.id === pickedId) ?? options?.find((o) => o.safest) ?? null;

  // Where the car is on the active route.
  const cum = useMemo(() => (active ? cumulativeKm(active.coordinates) : []), [active]);
  const totalKm = cum.length > 0 ? cum[cum.length - 1] : 0;
  const carIndex = active ? indexAtKm(cum, progressKm) : 0;
  const car = active ? { lat: active.coordinates[carIndex][1], lon: active.coordinates[carIndex][0] } : null;
  const arrived = active !== null && progressKm >= totalKm;

  const pending = active && !arrived && !halted ? firstHazardAhead(active.coordinates, cum, carIndex, hazards, handled) : null;

  const paused = pending !== null || arrived || halted;

  // Demo drive (clearly labelled in the UI): only when GPS is not on the route.
  useEffect(() => {
    if (stage !== "nav" || gps || paused) return;
    const timer = setInterval(() => setProgressKm((km) => km + DEMO_KM_PER_TICK), DEMO_TICK_MS);
    return () => clearInterval(timer);
  }, [stage, gps, paused]);

  // Real GPS takes over as soon as the phone is actually on the route.
  useEffect(() => {
    if (stage !== "nav" || !active || !("geolocation" in navigator)) return;
    const watch = navigator.geolocation.watchPosition(
      (pos) => {
        const near = nearestIndex(active.coordinates, { lat: pos.coords.latitude, lon: pos.coords.longitude });
        if (near.km > GPS_ON_ROUTE_KM) return;
        setGps(true);
        setProgressKm(cum[near.index]);
      },
      // No permission or no fix: the demo drive simply keeps going.
      () => {},
      { enableHighAccuracy: true },
    );
    return () => navigator.geolocation.clearWatch(watch);
  }, [stage, active, cum]);

  // Fresh options from the car's position as soon as a hazard comes up.
  const pendingId = pending?.hazard.id ?? "";
  useEffect(() => {
    if (!pending || !to || !car) return;
    const avoid = pending.hazard.kind === "jam" ? [...closed, pending.hazard] : closed;
    let stale = false;
    fetchOptions(car, to, avoid, storm)
      .then((options) => !stale && setAlertFetch({ key: pendingId, options, failed: false }))
      .catch(() => !stale && setAlertFetch({ key: pendingId, options: null, failed: true }));
    return () => {
      stale = true;
    };
    // Only a new hazard should trigger a new search; the car is paused meanwhile.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingId]);
  const alertResult = alertFetch?.key === pendingId ? alertFetch : null;

  const alert: TripAlert | null = pending
    ? { ...pending, options: alertResult?.options ?? null, failed: alertResult?.failed ?? false }
    : null;

  function reset() {
    setActive(null);
    setProgressKm(0);
    setGps(false);
    setHalted(false);
    setDemoHazards([]);
    setHandled(new Set());
    setPickedId(null);
  }

  return {
    stage,
    from,
    to,
    options,
    planLoading: planKey !== "" && !planResult,
    planFailed: planResult?.failed ?? false,
    selected,
    active,
    car,
    gps,
    arrived,
    halted,
    remainingKm: Math.max(0, Math.round(totalKm - progressKm)),
    remainingHours: active && totalKm > 0 ? Math.max(0, Math.round(active.hours * (1 - progressKm / totalKm) * 10) / 10) : 0,
    demoHazards,
    alert,
    setFrom,
    setTo,
    pick: setPickedId,
    openPlanner: () => setStage("plan"),
    close: () => {
      reset();
      setStage("idle");
    },
    start: () => {
      if (!selected) return;
      reset();
      setActive(selected);
      setStage("nav");
    },
    // Called by the alert: a chosen option, or null to stay (jam) / stop before the closure.
    resolveAlert: (option: RouteOption | null) => {
      if (!pending) return;
      setHandled((ids) => new Set(ids).add(pending.hazard.id));
      if (option) {
        setActive(option);
        setProgressKm(0);
      } else if (pending.hazard.kind === "closure") {
        setHalted(true);
      }
    },
    // Demo only: drop a jam 12 km or a landslide 18 km ahead of the car.
    demoHazard: (kind: Hazard["kind"]) => {
      if (!active) return;
      const [lon, lat] = active.coordinates[indexAtKm(cum, progressKm + (kind === "jam" ? 12 : 18))];
      setDemoHazards((list) => [...list, { id: `demo-${kind}-${list.length}`, kind, lat, lon }]);
    },
  };
}
