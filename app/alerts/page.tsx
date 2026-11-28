import Screen from "@/components/Screen";
import AlertsList from "@/components/AlertsList";
import { getTownWeather, HEAVY_RAIN_MM, SNOW_CM } from "@/lib/town-weather";

// Disaster alerts: driver hazard reports (live) plus heavy rain and snowfall in the forecast.
export default async function AlertsPage() {
  const towns = await getTownWeather();
  const rain = towns?.flatMap((t) => t.days.filter((d) => d.rainMm >= HEAVY_RAIN_MM).map((d) => ({ town: t.name, date: d.date, amount: `${d.rainMm} mm` }))) ?? [];
  const snow = towns?.flatMap((t) => t.days.filter((d) => d.snowCm >= SNOW_CM).map((d) => ({ town: t.name, date: d.date, amount: `${d.snowCm} cm` }))) ?? [];
  return (
    <Screen icon="bell" title="Disaster Alerts" subtitle="Real-time alerts for natural hazards in your area.">
      <AlertsList rain={rain} snow={snow} weatherDown={!towns} />
    </Screen>
  );
}
