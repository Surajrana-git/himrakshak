"use client";

import { useEffect, useRef, useState } from "react";
import {
  GeolocateControl,
  LngLatBounds,
  Map as MapLibreMap,
  Popup,
  setWorkerUrl,
  type GeoJSONSource,
  type PaddingOptions,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { RISK_STYLE, type RiskLevel } from "@/lib/risk";
import { REPORT_KINDS, timeAgo, type Report } from "@/lib/reports";

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

type Props = {
  segments: MapSegment[];
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

function reportsToGeoJSON(reports: Report[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: reports.map((r) => ({
      type: "Feature",
      properties: { id: r.id, clear: r.kind === "clear" },
      geometry: { type: "Point", coordinates: [r.lon, r.lat] },
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
    img.className = "mt-2 max-h-40 w-full object-cover";
    root.append(img);
  }
  return root;
}

export default function RiskMap({ segments, towns, reports, focusId, onSelectSegment, locateSignal, fitSignal }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const geolocateRef = useRef<GeolocateControl | null>(null);
  const reportsRef = useRef(reports);
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

      map.addSource("reports", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: "reports",
        type: "circle",
        source: "reports",
        paint: {
          "circle-radius": 10,
          "circle-color": ["case", ["get", "clear"], "#5FB3A1", "#B03030"],
          "circle-stroke-color": "#F3F1EA",
          "circle-stroke-width": 3,
        },
      });

      map.on("click", "segments", (e) => {
        const id = e.features?.[0]?.properties.id;
        if (typeof id === "string") onSelectRef.current(id);
      });
      map.on("click", "reports", (e) => {
        const id = e.features?.[0]?.properties.id;
        const report = reportsRef.current.find((r) => r.id === id);
        if (report) new Popup({ maxWidth: "260px" }).setLngLat([report.lon, report.lat]).setDOMContent(reportPopup(report)).addTo(map);
      });
      for (const layer of ["segments", "reports"]) {
        map.on("mouseenter", layer, () => (map.getCanvas().style.cursor = "pointer"));
        map.on("mouseleave", layer, () => (map.getCanvas().style.cursor = ""));
      }
      setLoaded(true);
    });

    return () => map.remove();
  }, [towns]);

  useEffect(() => {
    if (!loaded) return;
    mapRef.current?.getSource<GeoJSONSource>("segments")?.setData(segmentsToGeoJSON(segments, focusId));
  }, [loaded, segments, focusId]);

  useEffect(() => {
    reportsRef.current = reports;
    if (!loaded) return;
    mapRef.current?.getSource<GeoJSONSource>("reports")?.setData(reportsToGeoJSON(reports));
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
