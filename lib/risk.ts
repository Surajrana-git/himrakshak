// Risk engine. Kept deliberately simple so it can be explained to judges.
// score = rainScore × slopeFactor × historyFactor, capped at 100.

export type RiskLevel = "low" | "medium" | "high";

// `text` keeps labels readable on each colour (4.5:1 contrast or better).
export const RISK_STYLE: Record<RiskLevel, { color: string; text: string; label: string; hindi: string }> = {
  low: { color: "#5FB3A1", text: "#14231F", label: "Low risk", hindi: "कम खतरा" },
  medium: { color: "#F08A3E", text: "#14231F", label: "Medium risk", hindi: "मध्यम खतरा" },
  high: { color: "#B03030", text: "#F3F1EA", label: "High risk", hindi: "ज़्यादा खतरा" },
};

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

// IMD calls 64.5 mm in 24 h "heavy rain"; that alone lands near 100.
// Rain still to come in the next 6 h is weighted higher than rain already fallen.
export function rainScore(last24hMm: number, next6hMm: number): number {
  return Math.min(100, last24hMm * 1.5 + next6hMm * 4);
}

export function segmentScore(
  hourlyMm: number[],
  nowIndex: number,
  slopeFactor: number,
  historyFactor: number,
): number {
  const last24h = sum(hourlyMm.slice(Math.max(0, nowIndex - 24), nowIndex));
  const next6h = sum(hourlyMm.slice(nowIndex, nowIndex + 6));
  return Math.min(100, Math.round(rainScore(last24h, next6h) * slopeFactor * historyFactor));
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
