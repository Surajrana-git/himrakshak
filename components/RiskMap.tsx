"use client";

import { useEffect, useRef, useState } from "react";
import { LngLatBounds, Map as MapLibreMap, Popup, setWorkerUrl, type GeoJSONSource } from "maplibre-gl";
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
};

const MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";

function toGeoJSON(segments: MapSegment[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: segments.map((s) => ({
      type: "Feature",
      properties: { color: RISK_STYLE[s.level].color },
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

export default function RiskMap({ segments, towns, reports }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const reportsRef = useRef(reports);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!container.current) return;
    const bounds = new LngLatBounds();
    towns.forEach((t) => bounds.extend([t.lon, t.lat]));

    const map = new MapLibreMap({
      container: container.current,
      style: MAP_STYLE,
      bounds,
      fitBoundsOptions: { padding: 40 },
    });
    mapRef.current = map;

    map.on("load", () => {
      map.addSource("segments", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: "segments-casing",
        type: "line",
        source: "segments",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#14231F", "line-width": 9 },
      });
      map.addLayer({
        id: "segments",
        type: "line",
        source: "segments",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": ["get", "color"], "line-width": 6 },
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
        paint: { "circle-radius": 5, "circle-color": "#F3F1EA", "circle-stroke-color": "#14231F", "circle-stroke-width": 2 },
      });
      map.addLayer({
        id: "town-labels",
        type: "symbol",
        source: "towns",
        layout: { "text-field": ["get", "name"], "text-font": ["Noto Sans Bold"], "text-size": 13, "text-offset": [0, 1.2] },
        paint: { "text-color": "#14231F", "text-halo-color": "#F3F1EA", "text-halo-width": 2 },
      });

      map.addSource("reports", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: "reports",
        type: "circle",
        source: "reports",
        paint: {
          "circle-radius": 9,
          "circle-color": ["case", ["get", "clear"], "#5FB3A1", "#D64545"],
          "circle-stroke-color": "#F3F1EA",
          "circle-stroke-width": 3,
        },
      });
      map.on("click", "reports", (e) => {
        const id = e.features?.[0]?.properties.id;
        const report = reportsRef.current.find((r) => r.id === id);
        if (report) new Popup({ maxWidth: "260px" }).setLngLat([report.lon, report.lat]).setDOMContent(reportPopup(report)).addTo(map);
      });
      map.on("mouseenter", "reports", () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", "reports", () => (map.getCanvas().style.cursor = ""));
      setLoaded(true);
    });

    return () => map.remove();
  }, [towns]);

  useEffect(() => {
    if (!loaded) return;
    mapRef.current?.getSource<GeoJSONSource>("segments")?.setData(toGeoJSON(segments));
  }, [loaded, segments]);

  useEffect(() => {
    reportsRef.current = reports;
    if (!loaded) return;
    mapRef.current?.getSource<GeoJSONSource>("reports")?.setData(reportsToGeoJSON(reports));
  }, [loaded, reports]);

  return <div ref={container} className="h-full w-full" aria-label="Route risk map" />;
}
