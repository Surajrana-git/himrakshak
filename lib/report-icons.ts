import type { ReportKind } from "@/lib/reports";

// Our own line icons (24×24, drawn with stroke) so the map reads like a traffic app:
// one picture per hazard, shared by map pins, the report form and the list.
export const REPORT_ICONS: Record<ReportKind, string[]> = {
  // A slope with rocks sliding down it.
  landslide: ["M2 20h20", "M3 20 9 8l5 6", "M13 17a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0-3.2 0", "M17.5 13a1.3 1.3 0 1 0 2.6 0a1.3 1.3 0 1 0-2.6 0"],
  // A cliff with stones falling off it.
  rockfall: ["M4 2v20h16", "M11 7a2 2 0 1 0 4 0a2 2 0 1 0-4 0", "M14 15a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0-3.2 0", "M8 11l1 2"],
  // A striped road barrier.
  road_blocked: ["M3 9h18v5H3z", "M8 9l-3 5", "M13 9l-3 5", "M18 9l-3 5", "M5 14v6", "M19 14v6"],
  // Water flowing over the road.
  water: ["M2 8c2.5-2 4.5-2 7 0s4.5 2 7 0 3.5-1.5 6 0", "M2 13c2.5-2 4.5-2 7 0s4.5 2 7 0 3.5-1.5 6 0", "M2 18c2.5-2 4.5-2 7 0s4.5 2 7 0 3.5-1.5 6 0"],
  clear: ["M5 12.5l4.5 4.5L19 7.5"],
};

// For map pins and popups, which are plain DOM (MapLibre markers), not React.
export function iconElement(paths: string[], sizePx: number): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", String(sizePx));
  svg.setAttribute("height", String(sizePx));
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2.2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  for (const d of paths) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    svg.append(path);
  }
  return svg;
}
