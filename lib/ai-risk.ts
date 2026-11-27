import { cacheLife } from "next/cache";
import model from "@/data/landslide-model.json";

// Trained by scripts/train-landslide-model.mjs (NASA LHASA rainfall index + NASA catalog events).
export type AiLevel = "low" | "medium" | "high";
export type AiDay = { level: AiLevel; percentile: number }; // percentile: share of 2010–2017 days that scored lower
export type AiRisk = { segmentId: string; today: AiDay; tomorrow: AiDay };
export type AiRiskFeed = { stretches: AiRisk[]; updatedAt: string };

const WEIGHTS = Array.from({ length: 7 }, (_, i) => (i + 1) ** -2);
const WSUM = WEIGHTS.reduce((a, b) => a + b, 0);

function day(mm: number[], t: number, ari95: number, month: number): AiDay {
  const ari = WEIGHTS.reduce((s, w, i) => s + w * (mm[t - i] ?? 0), 0) / WSUM;
  const rain14 = mm.slice(Math.max(0, t - 13), t + 1).reduce((a, b) => a + b, 0);
  const x = [Math.log1p(ari / ari95), Math.log1p(mm[t]), Math.log1p(rain14), month >= 6 && month <= 9 ? 1 : 0];
  const score = model.bias + x.reduce((s, v, j) => s + ((v - model.mean[j]) / model.std[j]) * model.weights[j], 0);
  const below = model.scoreSample.filter((s) => s < score).length;
  return {
    level: score >= model.thresholds.high ? "high" : score >= model.thresholds.medium ? "medium" : "low",
    percentile: Math.round((below / model.scoreSample.length) * 100),
  };
}

type DailyPoint = { daily: { time: string[]; precipitation_sum: (number | null)[] } };

// Re-scored every 30 minutes with the latest Open-Meteo rain (last 14 days, today, tomorrow).
export async function getAiRisk(segments: { id: string; rainPoint: { lat: number; lon: number } }[]): Promise<AiRiskFeed> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 1800, expire: 7200 });

  const params = new URLSearchParams({
    latitude: segments.map((s) => s.rainPoint.lat).join(","),
    longitude: segments.map((s) => s.rainPoint.lon).join(","),
    daily: "precipitation_sum",
    past_days: "14",
    forecast_days: "2",
    timezone: "Asia/Kolkata",
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error(`Open-Meteo returned ${res.status}`);
  const body: DailyPoint | DailyPoint[] = await res.json();
  const list = Array.isArray(body) ? body : [body];

  const stretches = segments.map((seg, k) => {
    const { time, precipitation_sum } = list[k].daily;
    const mm = precipitation_sum.map((v) => v ?? 0);
    const t = time.length - 2; // today; the last entry is tomorrow
    const ari95 = model.ari95[seg.id as keyof typeof model.ari95];
    return {
      segmentId: seg.id,
      today: day(mm, t, ari95, Number(time[t].slice(5, 7))),
      tomorrow: day(mm, t + 1, ari95, Number(time[t + 1].slice(5, 7))),
    };
  });
  return { stretches, updatedAt: new Date().toISOString() };
}
