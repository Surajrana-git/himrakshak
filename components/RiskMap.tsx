"use client";

import { useEffect, useRef, useState } from "react";
import {
  GeolocateControl,
  LngLatBounds,
  Map as MapLibreMap,
  Marker,
  Popup,
  setWorkerUrl,
  type GeoJSONSource,
  type PaddingOptions,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { RISK_STYLE, type RiskLevel } from "@/lib/risk";
import type { Turn } from "@/lib/trip";
import { REPORT_KINDS, timeAgo, type Report } from "@/lib/reports";
import { iconElement, LAKE_ICON, REPORT_ICONS } from "@/lib/report-icons";
import type { SlideNews } from "@/lib/slide-news";

// The bundler can't find MapLibre's worker next to its own chunk, so we serve a copy
// from /public (copied there by the `postinstall` script).
setWorkerUrl("/maplibre-gl-worker.mjs");

export type MapSegment = {
  id: string;
  from: string;
  to: string;
  distanceKm: number;
  coordinates: number[][];
  score: number;
  level: RiskLevel;
  // What the line and badge show right now: landslide risk or traffic.
  display: { color: string; text: string; label: string };
};

export type PastSlide = {
  id: string;
  date: string;
  title: string;
  accuracy: string;
  size: string;
  deaths: number;
  lat: number;
  lon: number;
};

type Props = {
  segments: MapSegment[];
  pastSlides: PastSlide[];
  news: SlideNews[];
  closures: { lat: number; lon: number }[];
  jams: { lat: number; lon: number }[];
  detour: number[][] | null;
  detourSignal: number;
  // Trip: route options (one selected) or the route being driven, the car, and camera behaviour.
  // stretches: risk of each ~10 km piece, drawn in risk colours on top of the chosen route.
  tripLines: { id: string; coordinates: number[][]; selected: boolean; stretches?: { start: number; end: number; level: RiskLevel }[] }[];
  fitLine: number[][] | null;
  car: { lat: number; lon: number } | null;
  // Within ~600 m of a turn: tilt into a 3D view along the road and draw the arrow through the junction.
  junction: Turn | null;
  lakes: { id: string; name: string; lat: number; lon: number }[];
  onSelectLake: (id: string) => void;
  towns: { name: string; lat: number; lon: number }[];
  reports: Report[];
  focusId: string | null;
  onSelectSegment: (id: string) => void;
  locateSignal: number;
  fitSignal: number;
  baseMap: BaseMap;
  northSignal: number;
  focusPoint: { lat: number; lon: number } | null;
};

export type BaseMap = "standard" | "satellite" | "terrain";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

// Keep the route clear of the floating panel: left side on desktop, bottom sheet on phones.
function viewPadding(): PaddingOptions {
  if (window.innerWidth >= 768) return { top: 48, bottom: 48, left: 456, right: 88 };
  // With the phone keyboard open the screen is short; padding taller than the map makes
  // MapLibre zoom out to the whole country, so keep at least 120 px of map visible.
  const top = Math.min(160, Math.round(window.innerHeight * 0.25));
  const bottom = Math.max(0, Math.min(Math.round(window.innerHeight * 0.45), window.innerHeight - top - 120));
  return { top, bottom, left: 32, right: 72 };
}

function boundsOf(coordinates: number[][]): LngLatBounds {
  const bounds = new LngLatBounds();
  coordinates.forEach(([lon, lat]) => bounds.extend([lon, lat]));
  return bounds;
}

function segmentsToGeoJSON(segments: MapSegment[], focusId: string | null): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: segments.map((s) => ({
      type: "Feature",
      properties: { id: s.id, color: s.display.color, focused: s.id === focusId },
      geometry: { type: "LineString", coordinates: s.coordinates },
    })),
  };
}

// Built with textContent, never innerHTML: report text comes from the public.
function reportPopup(report: Report): HTMLElement {
  const root = document.createElement("div");
  root.className = "text-ink";
  const title = document.createElement("p");
  title.className = "font-semibold";
  title.textContent = REPORT_KINDS[report.kind].label;
  const time = document.createElement("p");
  time.className = "text-sm text-muted";
  time.textContent = timeAgo(report.created_at);
  root.append(title, time);
  if (report.note) {
    const note = document.createElement("p");
    note.textContent = report.note;
    root.append(note);
  }
  if (report.photo_url) {
    const img = document.createElement("img");
    img.src = report.photo_url;
    img.alt = "Report photo";
    img.className = "mt-2 max-h-48 w-full rounded-lg object-cover";
    root.append(img);
  }
  return root;
}

function pastSlidePopup(slide: PastSlide): HTMLElement {
  const root = document.createElement("div");
  root.className = "text-ink";
  const lines: [string, string][] = [
    ["font-semibold", "Purana landslide · Past landslide"],
    ["text-sm text-muted", new Date(slide.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })],
    ["", slide.title],
  ];
  if (slide.deaths > 0) lines.push(["font-semibold text-danger", `${slide.deaths} logon ki maut / deaths`]);
  lines.push(["mt-1 text-xs text-muted", `NASA record · size ${slide.size.replace("_", " ")} · location ±${slide.accuracy}`]);
  for (const [className, text] of lines) {
    const p = document.createElement("p");
    p.className = className;
    p.textContent = text;
    root.append(p);
  }
  return root;
}

// Waze-style pin: the photo itself when there is one, otherwise the hazard icon.
function reportPin(report: Report): HTMLElement {
  const { ring, fill, tail: tailColor } = REPORT_KINDS[report.kind];
  const pin = document.createElement("button");
  pin.type = "button";
  pin.setAttribute("aria-label", `${REPORT_KINDS[report.kind].label}, ${timeAgo(report.created_at)}`);
  pin.className = "relative z-10 flex flex-col items-center";

  const head = document.createElement("span");
  if (report.photo_url) {
    head.className = `relative block h-14 w-14 rounded-full border-[3px] ${ring} bg-snow shadow-lg`;
    const img = document.createElement("img");
    img.src = report.photo_url;
    img.alt = "";
    img.className = "h-full w-full rounded-full object-cover";
    const badge = document.createElement("span");
    badge.className = `absolute -right-1.5 -bottom-1.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-snow ${fill}`;
    badge.append(iconElement(REPORT_ICONS[report.kind], 16));
    head.append(img, badge);
  } else {
    head.className = `flex h-12 w-12 items-center justify-center rounded-full border-[3px] border-snow shadow-lg ${fill}`;
    head.append(iconElement(REPORT_ICONS[report.kind], 26));
  }
  const tail = document.createElement("span");
  tail.className = `-mt-1.5 block h-3 w-3 rotate-45 ${tailColor}`;
  pin.append(head, tail);
  return pin;
}

// One pin per place, so ten stories about Sirobagad don't stack on top of each other.
function newsPin(place: string, count: number): HTMLElement {
  const pin = document.createElement("button");
  pin.type = "button";
  pin.setAttribute("aria-label", `${count} landslide news reports near ${place}`);
  pin.className = "relative flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-danger bg-snow text-danger shadow-lg";
  pin.append(iconElement(REPORT_ICONS.landslide, 24));
  const badge = document.createElement("span");
  badge.className = "absolute -top-2 -right-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-ink px-1 text-xs font-bold text-snow";
  badge.textContent = String(count);
  pin.append(badge);
  return pin;
}

function newsPopup(place: string, items: SlideNews[]): HTMLElement {
  const root = document.createElement("div");
  root.className = "text-ink";
  const title = document.createElement("p");
  title.className = "font-semibold";
  title.textContent = `Recent news near ${place}`;
  root.append(title);
  for (const n of items.slice(0, 4)) {
    const a = document.createElement("a");
    a.href = n.link;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.className = "mt-2 block border-t border-ink/15 pt-2";
    const headline = document.createElement("span");
    headline.className = "block leading-snug underline";
    headline.textContent = n.title;
    const meta = document.createElement("span");
    meta.className = "block text-xs text-muted";
    meta.textContent = `${n.source} · ${new Date(n.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;
    a.append(headline, meta);
    root.append(a);
  }
  const note = document.createElement("p");
  note.className = "mt-2 text-xs text-muted";
  note.textContent = "Place is approximate (from the town named in the news)";
  root.append(note);
  return root;
}

function closurePin(): HTMLElement {
  const pin = document.createElement("div");
  pin.setAttribute("role", "img");
  pin.setAttribute("aria-label", "Road closed");
  pin.className = "relative z-20 flex items-center gap-1 rounded-full border-[3px] border-snow bg-danger py-1 pr-3 pl-1.5 font-bold text-snow shadow-xl";
  pin.append(iconElement(REPORT_ICONS.road_blocked, 24));
  const label = document.createElement("span");
  label.textContent = "CLOSED";
  pin.append(label);
  return pin;
}

function jamPin(): HTMLElement {
  const pin = document.createElement("div");
  pin.setAttribute("role", "img");
  pin.setAttribute("aria-label", "Traffic jam");
  pin.className = "flex items-center gap-1 rounded-full border-[3px] border-snow bg-orange py-1 pr-3 pl-1.5 font-bold text-ink shadow-xl";
  pin.append(iconElement(REPORT_ICONS.jam, 24));
  const label = document.createElement("span");
  label.textContent = "JAAM";
  pin.append(label);
  return pin;
}

function lakePin(name: string): HTMLElement {
  const pin = document.createElement("button");
  pin.type = "button";
  pin.setAttribute("aria-label", `Glacial lake: ${name}`);
  pin.className = "flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-snow bg-ink text-snow shadow-lg";
  pin.append(iconElement(LAKE_ICON, 24));
  return pin;
}

function carPin(): HTMLElement {
  const pin = document.createElement("div");
  pin.setAttribute("role", "img");
  pin.setAttribute("aria-label", "Your vehicle");
  pin.className = "relative z-30 flex h-9 w-9 items-center justify-center rounded-full border-4 border-snow bg-ink shadow-xl";
  const dot = document.createElement("span");
  dot.className = "h-3 w-3 rounded-full bg-orange";
  pin.append(dot);
  return pin;
}

function arrowHeadPin(): HTMLElement {
  const pin = document.createElement("div");
  pin.innerHTML = '<svg viewBox="0 0 24 24" width="44" height="44"><path d="M12 2 22 22 12 17 2 22z" fill="#A9481A" stroke="#F3F1EA" stroke-width="2" stroke-linejoin="round"/></svg>';
  return pin;
}

function pastSlidePin(slide: PastSlide): HTMLElement {
  const pin = document.createElement("button");
  pin.type = "button";
  pin.setAttribute("aria-label", `Past landslide, ${slide.date}`);
  pin.className = "past-slide flex h-8 w-8 items-center justify-center rounded-full border-2 border-snow bg-ink text-orange shadow-md";
  pin.append(iconElement(REPORT_ICONS.landslide, 18));
  return pin;
}

export default function RiskMap({
  segments,
  pastSlides,
  news,
  closures,
  jams,
  detour,
  detourSignal,
  tripLines,
  fitLine,
  car,
  junction,
  lakes,
  onSelectLake,
  towns,
  reports,
  focusId,
  onSelectSegment,
  locateSignal,
  fitSignal,
  baseMap,
  northSignal,
  focusPoint,
}: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const geolocateRef = useRef<GeolocateControl | null>(null);
  const reportMarkers = useRef<Marker[]>([]);
  const newsMarkers = useRef<Marker[]>([]);
  const closureMarkers = useRef<Marker[]>([]);
  const jamMarkers = useRef<Marker[]>([]);
  const carMarker = useRef<Marker | null>(null);
  const arrowHead = useRef<Marker | null>(null);
  const lakeMarkers = useRef<Marker[]>([]);
  const onSelectLakeRef = useRef(onSelectLake);
  const onSelectRef = useRef(onSelectSegment);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    onSelectRef.current = onSelectSegment;
    onSelectLakeRef.current = onSelectLake;
  }, [onSelectSegment, onSelectLake]);

  useEffect(() => {
    const map = mapRef.current;
    if (!loaded || !map) return;
    lakeMarkers.current.forEach((m) => m.remove());
    lakeMarkers.current = lakes.map((lake) => {
      const pin = lakePin(lake.name);
      pin.addEventListener("click", () => onSelectLakeRef.current(lake.id));
      return new Marker({ element: pin }).setLngLat([lake.lon, lake.lat]).addTo(map);
    });
  }, [loaded, lakes]);

  useEffect(() => {
    if (!container.current) return;
    const routeBounds = boundsOf(towns.map((t) => [t.lon, t.lat]));

    const map = new MapLibreMap({
      container: container.current,
      style: MAP_STYLE,
      bounds: routeBounds,
      fitBoundsOptions: { padding: viewPadding() },
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    // The OpenFreeMap style names a few POI icons (atm, gate…) its sprite lacks; draw nothing instead of warning.
    map.setMissingStyleImageResolver((id) => {
      if (!map.hasImage(id)) map.addImage(id, { width: 1, height: 1, data: new Uint8Array(4) });
    });

    // Its own button is hidden (see globals.css); ours calls trigger().
    const geolocate = new GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
    });
    map.addControl(geolocate, "top-left");
    geolocateRef.current = geolocate;

    map.on("load", () => {
      // Satellite (Esri World Imagery) and terrain (OpenTopoMap): free raster layers over the base map,
      // under all our own lines and pins. Hidden until picked in the Layers menu.
      map.addSource("satellite", {
        type: "raster",
        tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
        tileSize: 256,
        maxzoom: 18,
        attribution: "Imagery © Esri, Maxar, Earthstar Geographics",
      });
      map.addLayer({ id: "satellite", type: "raster", source: "satellite", layout: { visibility: "none" } });
      map.addSource("terrain", {
        type: "raster",
        tiles: ["https://a.tile.opentopomap.org/{z}/{x}/{y}.png", "https://b.tile.opentopomap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        maxzoom: 17,
        attribution: "© OpenTopoMap (CC-BY-SA)",
      });
      map.addLayer({ id: "terrain", type: "raster", source: "terrain", layout: { visibility: "none" } });

      // The detour: dark line with light dashes, drawn under the route so where it shares
      // NH-7 the risk colours stay visible and only the part that turns off shows.
      map.addSource("detour", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: "detour-casing",
        type: "line",
        source: "detour",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#14231F", "line-width": 8 },
      });
      map.addLayer({
        id: "detour",
        type: "line",
        source: "detour",
        layout: { "line-join": "round" },
        paint: { "line-color": "#F3F1EA", "line-width": 3, "line-dasharray": [2, 2] },
      });

      // Junction arrow: white casing, orange-dark body, drawn on top of everything in the 3D view.
      map.addSource("junction", { type: "geojson", data: { type: "FeatureCollection", features: [] } });

      // Trip lines sit under the risk colours too: options are faint, the chosen one is bold.
      map.addSource("trip", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: "trip-other",
        type: "line",
        source: "trip",
        filter: ["all", ["!", ["get", "selected"]], ["!", ["has", "riskColor"]]],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#4B5A55", "line-width": 6, "line-opacity": 0.55 },
      });
      map.addLayer({
        id: "trip-selected",
        type: "line",
        source: "trip",
        filter: ["all", ["get", "selected"], ["!", ["has", "riskColor"]]],
        layout: { "line-cap": "round", "line-join": "round" },
        // Wider than the risk line, so on NH-7 it shows as a halo and elsewhere as the road to take.
        paint: { "line-color": "#A9481A", "line-width": 14 },
      });
      // Google-Maps-traffic style: each ~10 km of the chosen road in its landslide-risk colour.
      map.addLayer({
        id: "trip-risk",
        type: "line",
        source: "trip",
        filter: ["has", "riskColor"],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": ["get", "riskColor"], "line-width": 7 },
      });

      map.addSource("segments", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: "segments-casing",
        type: "line",
        source: "segments",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#14231F", "line-width": ["case", ["get", "focused"], 14, 10] },
      });
      map.addLayer({
        id: "segments",
        type: "line",
        source: "segments",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": ["get", "color"], "line-width": ["case", ["get", "focused"], 9, 6] },
      });

      map.addSource("towns", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: towns.map((t) => ({
            type: "Feature",
            properties: { name: t.name },
            geometry: { type: "Point", coordinates: [t.lon, t.lat] },
          })),
        },
      });
      map.addLayer({
        id: "towns",
        type: "circle",
        source: "towns",
        paint: { "circle-radius": 6, "circle-color": "#F3F1EA", "circle-stroke-color": "#14231F", "circle-stroke-width": 3 },
      });

      map.on("click", "segments", (e) => {
        const id = e.features?.[0]?.properties.id;
        if (typeof id === "string") onSelectRef.current(id);
      });
      // Zoomed out, 29 full pins would hide the route colours, so they shrink to dots.
      const markFar = () => container.current?.toggleAttribute("data-far", map.getZoom() < 10);
      markFar();
      map.on("zoomend", markFar);

      map.on("mouseenter", "segments", () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", "segments", () => (map.getCanvas().style.cursor = ""));

      for (const slide of pastSlides) {
        new Marker({ element: pastSlidePin(slide) })
          .setLngLat([slide.lon, slide.lat])
          .setPopup(new Popup({ maxWidth: "260px", offset: 18 }).setDOMContent(pastSlidePopup(slide)))
          .addTo(map);
      }
      // Junction arrow on top of everything else (filled while near a turn).
      map.addLayer({
        id: "junction-casing",
        type: "line",
        source: "junction",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#F3F1EA", "line-width": 22 },
      });
      map.addLayer({
        id: "junction-body",
        type: "line",
        source: "junction",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#A9481A", "line-width": 14 },
      });
      setLoaded(true);
    });

    return () => {
      map.remove();
      // Next keeps this page alive in the background; when it comes back a new map starts unloaded.
      setLoaded(false);
    };
  }, [towns, pastSlides]);

  useEffect(() => {
    if (!loaded) return;
    mapRef.current?.getSource<GeoJSONSource>("segments")?.setData(segmentsToGeoJSON(segments, focusId));
  }, [loaded, segments, focusId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!loaded || !map) return;
    const byPlace = new Map<string, SlideNews[]>();
    for (const n of news) if (n.place) byPlace.set(n.place, [...(byPlace.get(n.place) ?? []), n]);
    newsMarkers.current.forEach((m) => m.remove());
    newsMarkers.current = [...byPlace].map(([place, items]) =>
      new Marker({ element: newsPin(place, items.length) })
        .setLngLat([items[0].lon!, items[0].lat!])
        .setPopup(new Popup({ maxWidth: "280px", offset: 24 }).setDOMContent(newsPopup(place, items)))
        .addTo(map),
    );
  }, [loaded, news]);

  useEffect(() => {
    const map = mapRef.current;
    if (!loaded || !map) return;
    map.getSource<GeoJSONSource>("detour")?.setData({
      type: "FeatureCollection",
      features: detour ? [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: detour } }] : [],
    });
  }, [loaded, detour]);

  useEffect(() => {
    const map = mapRef.current;
    if (!loaded || !map) return;
    map.getSource<GeoJSONSource>("trip")?.setData({
      type: "FeatureCollection",
      // Selected last so it draws on top of the faint options.
      features: [...tripLines]
        .sort((a, b) => Number(a.selected) - Number(b.selected))
        .flatMap((l) => [
          { type: "Feature" as const, properties: { selected: l.selected }, geometry: { type: "LineString" as const, coordinates: l.coordinates } },
          ...(l.selected && l.stretches ? l.stretches : []).map((s) => ({
            type: "Feature" as const,
            properties: { selected: true, riskColor: RISK_STYLE[s.level].color },
            geometry: { type: "LineString" as const, coordinates: l.coordinates.slice(s.start, s.end + 1) },
          })),
        ]),
    });
  }, [loaded, tripLines]);

  useEffect(() => {
    const map = mapRef.current;
    if (!loaded || !map || !fitLine) return;
    map.fitBounds(boundsOf(fitLine), { padding: viewPadding(), duration: 800 });
  }, [loaded, fitLine]);

  // While driving the camera follows the car, like turn-by-turn apps.
  const carLat = car?.lat;
  const junctionBearing = junction ? Math.round(junction.bearing) : undefined;
  const junctionPath = junction?.path ?? null;
  // The path is a new array every render; only redraw when the points really change.
  const junctionKey = junctionPath?.flat().join() ?? "";
  const carLon = car?.lon;
  useEffect(() => {
    const map = mapRef.current;
    if (!loaded || !map) return;
    if (carLat === undefined || carLon === undefined) {
      carMarker.current?.remove();
      carMarker.current = null;
      return;
    }
    if (!carMarker.current) carMarker.current = new Marker({ element: carPin() }).setLngLat([carLon, carLat]).addTo(map);
    carMarker.current.setLngLat([carLon, carLat]);
    if (junctionBearing !== undefined) {
      // Real OSM geometry and 3D buildings (OpenFreeMap), tilted along the direction of travel.
      map.easeTo({ center: [carLon, carLat], zoom: 17, pitch: 60, bearing: junctionBearing, padding: viewPadding(), duration: 380 });
    } else {
      map.easeTo({ center: [carLon, carLat], zoom: Math.max(Math.min(map.getZoom(), 14), 10), pitch: 0, bearing: 0, padding: viewPadding(), duration: 380 });
    }
  }, [loaded, carLat, carLon, junctionBearing]);

  useEffect(() => {
    const map = mapRef.current;
    if (!loaded || !map) return;
    map.getSource<GeoJSONSource>("junction")?.setData({
      type: "FeatureCollection",
      features: junctionPath ? [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: junctionPath } }] : [],
    });
    arrowHead.current?.remove();
    arrowHead.current = null;
    if (junctionPath && junctionPath.length > 1) {
      const end = junctionPath[junctionPath.length - 1];
      const prev = junctionPath[junctionPath.length - 2];
      const rotation = (Math.atan2(end[0] - prev[0], end[1] - prev[1]) * 180) / Math.PI;
      arrowHead.current = new Marker({ element: arrowHeadPin(), rotation, rotationAlignment: "map", pitchAlignment: "map" })
        .setLngLat(end as [number, number])
        .addTo(map);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, junctionKey]);

  useEffect(() => {
    const map = mapRef.current;
    if (!loaded || !map) return;
    jamMarkers.current.forEach((m) => m.remove());
    jamMarkers.current = jams.map((j) => new Marker({ element: jamPin() }).setLngLat([j.lon, j.lat]).addTo(map));
  }, [loaded, jams]);

  useEffect(() => {
    const map = mapRef.current;
    if (!loaded || !map) return;
    closureMarkers.current.forEach((m) => m.remove());
    closureMarkers.current = closures.map((c) => new Marker({ element: closurePin() }).setLngLat([c.lon, c.lat]).addTo(map));
  }, [loaded, closures]);

  useEffect(() => {
    const map = mapRef.current;
    if (!loaded || !map || detourSignal === 0 || !detour) return;
    // The detour shares most of NH-7, so zoom to the part that leaves it (~300 m off the route).
    const routePoints = segments.flatMap((seg) => seg.coordinates);
    const offRoute = detour.filter(([x, y]) => routePoints.every(([rx, ry]) => Math.abs(rx - x) + Math.abs(ry - y) > 0.004));
    map.fitBounds(boundsOf(offRoute.length > 1 ? offRoute : detour), { padding: viewPadding(), duration: 800 });
    // Only a tap on "show detour" should move the camera, not every new detour.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, detourSignal]);

  // Live reports change often; rebuilding up to 100 DOM pins is cheap.
  useEffect(() => {
    const map = mapRef.current;
    if (!loaded || !map) return;
    reportMarkers.current.forEach((m) => m.remove());
    reportMarkers.current = reports.map((r) =>
      new Marker({ element: reportPin(r), anchor: "bottom" })
        .setLngLat([r.lon, r.lat])
        .setPopup(new Popup({ maxWidth: "260px", offset: 60 }).setDOMContent(reportPopup(r)))
        .addTo(map),
    );
  }, [loaded, reports]);

  // Zoom to the chosen stretch, or back to the whole route.
  useEffect(() => {
    const map = mapRef.current;
    if (!loaded || !map) return;
    const focused = segments.find((s) => s.id === focusId);
    const bounds = focused ? boundsOf(focused.coordinates) : boundsOf(towns.map((t) => [t.lon, t.lat]));
    map.fitBounds(bounds, { padding: viewPadding(), duration: 800 });
    // segments changes every render; only a new focus or a "fit" tap should move the camera.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, focusId, fitSignal, towns]);

  // Only a new tap locates; coming back to this page must not fire an old one at an unloaded map.
  const locatedSignal = useRef(locateSignal);
  useEffect(() => {
    if (!loaded || locateSignal === locatedSignal.current) return;
    locatedSignal.current = locateSignal;
    geolocateRef.current?.trigger();
  }, [loaded, locateSignal]);

  useEffect(() => {
    if (loaded && focusPoint) mapRef.current?.easeTo({ center: [focusPoint.lon, focusPoint.lat], zoom: 13, padding: viewPadding(), duration: 800 });
  }, [loaded, focusPoint]);

  useEffect(() => {
    if (northSignal > 0) mapRef.current?.easeTo({ bearing: 0, pitch: 0, duration: 500 });
  }, [northSignal]);

  useEffect(() => {
    const map = mapRef.current;
    if (!loaded || !map) return;
    const apply = () => {
      map.setLayoutProperty("satellite", "visibility", baseMap === "satellite" ? "visible" : "none");
      map.setLayoutProperty("terrain", "visibility", baseMap === "terrain" ? "visible" : "none");
    };
    // Right after sign-in the page reloads while the style is still settling; changing it then throws.
    if (map.isStyleLoaded()) apply();
    else map.once("idle", apply);
    return () => {
      map.off("idle", apply);
    };
  }, [loaded, baseMap]);

  return <div ref={container} className="h-full w-full" aria-label="Route risk map" />;
}
