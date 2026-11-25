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
import { REPORT_KINDS, timeAgo, type Report } from "@/lib/reports";
import { iconElement, REPORT_ICONS } from "@/lib/report-icons";

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
  towns: { name: string; lat: number; lon: number }[];
  reports: Report[];
  focusId: string | null;
  onSelectSegment: (id: string) => void;
  locateSignal: number;
  fitSignal: number;
};

const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

// Keep the route clear of the floating panel: left side on desktop, bottom sheet on phones.
function viewPadding(): PaddingOptions {
  if (window.innerWidth >= 768) return { top: 48, bottom: 48, left: 456, right: 88 };
  return { top: 110, bottom: Math.round(window.innerHeight * 0.45), left: 32, right: 72 };
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
      properties: { id: s.id, color: RISK_STYLE[s.level].color, focused: s.id === focusId },
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
  title.textContent = `${REPORT_KINDS[report.kind].hindi} · ${REPORT_KINDS[report.kind].label}`;
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
  const danger = report.kind !== "clear";
  const ring = danger ? "border-danger" : "border-teal";
  const fill = danger ? "bg-danger text-snow" : "bg-teal text-ink";
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
  tail.className = `-mt-1.5 block h-3 w-3 rotate-45 ${danger ? "bg-danger" : "bg-teal"}`;
  pin.append(head, tail);
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

export default function RiskMap({ segments, pastSlides, towns, reports, focusId, onSelectSegment, locateSignal, fitSignal }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const geolocateRef = useRef<GeolocateControl | null>(null);
  const reportMarkers = useRef<Marker[]>([]);
  const onSelectRef = useRef(onSelectSegment);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    onSelectRef.current = onSelectSegment;
  }, [onSelectSegment]);

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

    // Its own button is hidden (see globals.css); ours calls trigger().
    const geolocate = new GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
    });
    map.addControl(geolocate, "top-left");
    geolocateRef.current = geolocate;

    map.on("load", () => {
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
      setLoaded(true);
    });

    return () => map.remove();
  }, [towns, pastSlides]);

  useEffect(() => {
    if (!loaded) return;
    mapRef.current?.getSource<GeoJSONSource>("segments")?.setData(segmentsToGeoJSON(segments, focusId));
  }, [loaded, segments, focusId]);

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

  useEffect(() => {
    if (locateSignal > 0) geolocateRef.current?.trigger();
  }, [locateSignal]);

  return <div ref={container} className="h-full w-full" aria-label="Route risk map" />;
}
