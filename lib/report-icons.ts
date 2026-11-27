import type { ReportKind } from "@/lib/reports";

// Our own solid icons (24×24, filled, even-odd holes) in the bold, friendly style of traffic
// apps like Waze: one picture per hazard that reads at a glance, on pins, buttons and lists.
export const REPORT_ICONS: Record<ReportKind, string> = {
  // A slope with boulders rolling off it.
  landslide: "M1.5 20.5 9 6.5l6.5 11.5v2.5z M17 18.5a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0z M15 12.5a1.8 1.8 0 1 0 3.6 0a1.8 1.8 0 1 0-3.6 0z",
  // A cliff with stones falling off it.
  rockfall: "M2.5 2h6.5v20H2.5z M12.5 7a2.6 2.6 0 1 0 5.2 0a2.6 2.6 0 1 0-5.2 0z M15.5 14.5a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0-4.4 0z M11.5 19.5a1.7 1.7 0 1 0 3.4 0a1.7 1.7 0 1 0-3.4 0z",
  // A striped road barrier on two legs.
  road_blocked: "M1.5 7.5h21v7h-21z M6.5 7.5h3l-3.5 7h-3z M13 7.5h3l-3.5 7h-3z M19.5 7.5h3v0l-3.5 7h-3z M4 14.5h2.5v7H4z M17.5 14.5H20v7h-2.5z",
  // A drop of water: flooding or a stream over the road.
  water: "M12 1.5C8 7.5 4.5 11 4.5 15.5a7.5 7.5 0 0 0 15 0C19.5 11 16 7.5 12 1.5z M9 14.5a3 3 0 0 0 3 3v2a5 5 0 0 1-5-5z",
  // A car seen from the front.
  jam: "M4 10.5 6.2 4.8A2 2 0 0 1 8.1 3.5h7.8a2 2 0 0 1 1.9 1.3l2.2 5.7h.5a1.5 1.5 0 0 1 1.5 1.5V18h-2v2.5h-3.5V18H7.5v2.5H4V18H2v-6a1.5 1.5 0 0 1 1.5-1.5z M7 9.5h10l-1.5-4h-7z M5 14a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0z M16 14a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0z",
  // A tick in a circle.
  clear: "M12 1.5a10.5 10.5 0 1 0 0 21a10.5 10.5 0 1 0 0-21z M10.4 16.6 5.9 12.1l1.8-1.8 2.7 2.7 6-6 1.8 1.8z",
};

// Peaks with a glacial lake below them, for the Predict layer.
export const LAKE_ICON = "M1 13.5 7 4.5l3.2 4.6L14 3l9 10.5z M1.5 16.5c3-2 5.5-2 8.5 0s5.5 2 8.5 0c1.5-1 3-1 4 0v5h-21z";

// For map pins and popups, which are plain DOM (MapLibre markers), not React.
export function iconElement(path: string, sizePx: number): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", String(sizePx));
  svg.setAttribute("height", String(sizePx));
  svg.setAttribute("fill", "currentColor");
  svg.setAttribute("aria-hidden", "true");
  const shape = document.createElementNS("http://www.w3.org/2000/svg", "path");
  shape.setAttribute("d", path);
  shape.setAttribute("fill-rule", "evenodd");
  svg.append(shape);
  return svg;
}
