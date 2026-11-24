// Risk engine. Kept deliberately simple so it can be explained to judges.
// score = rainScore × slopeFactor × historyFactor, capped at 100.

export type RiskLevel = "low" | "medium" | "high";

export const RISK_STYLE: Record<RiskLevel, { color: string; label: string; hindi: string }> = {
  low: { color: "#5FB3A1", label: "Low risk", hindi: "कम खतरा" },
  medium: { color: "#F08A3E", label: "Medium risk", hindi: "मध्यम खतरा" },
  high: { color: "#D64545", label: "High risk", hindi: "ज़्यादा खतरा" },
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

export function riskLevel(score: number): RiskLevel {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}
