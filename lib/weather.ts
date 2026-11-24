import { cacheLife } from "next/cache";

export type RainSeries = {
  times: string[]; // hourly, IST, e.g. "2026-11-24T21:00"
  mm: number[][]; // one hourly precipitation series per point
  nowIndex: number; // index of the current hour in `times`
};

type OpenMeteoPoint = {
  current: { time: string };
  hourly: { time: string[]; precipitation: (number | null)[] };
};

// Hourly rain for yesterday, today and tomorrow at each point (Open-Meteo, free, no key).
export async function getRain(points: { lat: number; lon: number }[]): Promise<RainSeries> {
  "use cache";
  cacheLife("minutes");

  const params = new URLSearchParams({
    latitude: points.map((p) => p.lat).join(","),
    longitude: points.map((p) => p.lon).join(","),
    hourly: "precipitation",
    current: "precipitation",
    past_days: "1",
    forecast_days: "2",
    timezone: "Asia/Kolkata",
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error(`Open-Meteo returned ${res.status}`);

  const body: OpenMeteoPoint | OpenMeteoPoint[] = await res.json();
  const list = Array.isArray(body) ? body : [body];
  const times = list[0].hourly.time;
  const currentHour = `${list[0].current.time.slice(0, 13)}:00`;

  return {
    times,
    mm: list.map((p) => p.hourly.precipitation.map((v) => v ?? 0)),
    nowIndex: times.indexOf(currentHour),
  };
}
