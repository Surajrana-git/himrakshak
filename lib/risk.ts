// Risk engine (0–100 per road stretch), explainable to judges:
//   Risk = 100 × (0.40 × S_static + 0.60 × T_dynamic)
//   S_static  = TEHD / 10. TEHD is the BIS IS 14496 (Part 2) Total Estimated Hazard (0–10); we estimate
//               it from what we have for every road: hillside slope and past landslides nearby (NASA).
//               Lithology, land cover and hydrogeology layers are not in yet.
//   T_dynamic = clamp(0.85 × T_rain, 0, 1), T_rain = max(rain past 24 h / 140 mm, rain next 6 h / 30 mm)
//               (140 mm / 24 h: Garhwal Himalaya I–D threshold). Soil moisture (15%) is not wired yet.
// A road blocked and confirmed by drivers is forced to 95 by the caller (ground truth beats weather).

export type RiskLevel = "low" | "medium" | "high";

// `text` keeps labels readable on each colour (4.5:1 contrast or better).
export const RISK_STYLE: Record<RiskLevel, { color: string; text: string; label: string }> = {
  low: { color: "#5FB3A1", text: "#14231F", label: "Low risk" },
  medium: { color: "#F08A3E", text: "#14231F", label: "Medium risk" },
  high: { color: "#B03030", text: "#F3F1EA", label: "High risk" },
};

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

export const BLOCKED_SCORE = 95;

// TEHD (0–10) from slope factor (1.0 flat … 2.0 at 35°) and history factor (1.0 none … 1.8 many slides).
export function tehd(slopeFactor: number, historyFactor: number): number {
  return Math.min(10, Math.max(0, 2 + 4 * (slopeFactor - 1) + 4 * ((historyFactor - 1) / 0.8)));
}

// 0–1: how close the rain is to the slide-triggering thresholds.
export function rainTrigger(last24hMm: number, next6hMm: number): number {
  return Math.min(1, Math.max(0, 0.85 * Math.max(last24hMm / 140, next6hMm / 30)));
}

export function segmentScore(
  hourlyMm: number[],
  nowIndex: number,
  slopeFactor: number,
  historyFactor: number,
): number {
  const last24h = sum(hourlyMm.slice(Math.max(0, nowIndex - 24), nowIndex));
  const next6h = sum(hourlyMm.slice(nowIndex, nowIndex + 6));
  const staticPart = tehd(slopeFactor, historyFactor) / 10;
  return Math.min(100, Math.round(100 * (0.4 * staticPart + 0.6 * rainTrigger(last24h, next6h))));
}

export type SegmentFactors = { slopeFactor: number; historyFactor: number };

// Hours from now (0 = leave now) until every stretch is below "high" risk.
// Null if no such hour exists in the next `lookaheadHours`.
export function safeDepartureHour(
  series: number[][],
  nowIndex: number,
  factors: SegmentFactors[],
  lookaheadHours = 12,
): number | null {
  for (let h = 0; h <= lookaheadHours; h++) {
    const allBelowHigh = series.every(
      (mm, i) => segmentScore(mm, nowIndex + h, factors[i].slopeFactor, factors[i].historyFactor) < 70,
    );
    if (allBelowHigh) return h;
  }
  return null;
}

// Demo only: adds a storm of `mmPerHour` for the next `hours` hours to every series.
export function withSimulatedStorm(series: number[][], nowIndex: number, mmPerHour: number, hours: number): number[][] {
  if (mmPerHour === 0) return series;
  return series.map((mm) => mm.map((v, i) => (i >= nowIndex && i < nowIndex + hours ? v + mmPerHour : v)));
}

export function riskLevel(score: number): RiskLevel {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}
