import { cacheLife } from "next/cache";

export type TownWeather = {
  name: string;
  lat: number;
  lon: number;
  nowC: number;
  code: number; // WMO weather code
  days: { date: string; rainMm: number; snowCm: number; maxC: number; minC: number }[];
};

// Towns travellers ask about, from the plains to the shrines.
export const TOWNS = [
  { name: "Dehradun", lat: 30.32, lon: 78.03 },
  { name: "Haridwar", lat: 29.95, lon: 78.16 },
  { name: "Rishikesh", lat: 30.09, lon: 78.27 },
  { name: "Rudraprayag", lat: 30.28, lon: 78.98 },
  { name: "Uttarkashi", lat: 30.73, lon: 78.44 },
  { name: "Joshimath", lat: 30.56, lon: 79.56 },
  { name: "Auli", lat: 30.53, lon: 79.57 },
  { name: "Kedarnath", lat: 30.73, lon: 79.07 },
  { name: "Badrinath", lat: 30.74, lon: 79.49 },
];

type OpenMeteo = {
  current: { temperature_2m: number; weather_code: number };
  daily: { time: string[]; precipitation_sum: number[]; snowfall_sum: number[]; temperature_2m_max: number[]; temperature_2m_min: number[] };
};

// Today and tomorrow for every town, one Open-Meteo request (free, no key). null if it is down.
export async function getTownWeather(): Promise<TownWeather[] | null> {
  "use cache";
  cacheLife("minutes");
  const params = new URLSearchParams({
    latitude: TOWNS.map((t) => t.lat).join(","),
    longitude: TOWNS.map((t) => t.lon).join(","),
    current: "temperature_2m,weather_code",
    daily: "precipitation_sum,snowfall_sum,temperature_2m_max,temperature_2m_min",
    forecast_days: "2",
    timezone: "Asia/Kolkata",
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`).catch(() => null);
  if (!res?.ok) return null;
  const all: OpenMeteo[] = await res.json();
  return all.map((w, i) => ({
    ...TOWNS[i],
    nowC: Math.round(w.current.temperature_2m),
    code: w.current.weather_code,
    days: w.daily.time.map((date, d) => ({
      date,
      rainMm: w.daily.precipitation_sum[d],
      snowCm: w.daily.snowfall_sum[d],
      maxC: Math.round(w.daily.temperature_2m_max[d]),
      minC: Math.round(w.daily.temperature_2m_min[d]),
    })),
  }));
}

// WMO codes in words a driver reads at a glance.
export function sky(code: number): string {
  if (code === 0) return "Clear";
  if (code <= 3) return "Cloudy";
  if (code <= 48) return "Fog";
  if (code <= 67 || (code >= 80 && code <= 82)) return "Rain";
  if (code <= 77 || code === 85 || code === 86) return "Snow";
  return "Thunderstorm";
}

// Thresholds a traveller should hear about (IMD's "heavy rain" starts at 64.5 mm a day).
export const HEAVY_RAIN_MM = 64.5;
export const SNOW_CM = 2;
