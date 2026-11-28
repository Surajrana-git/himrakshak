import Screen from "@/components/Screen";
import { getTownWeather, sky } from "@/lib/town-weather";

const day = (iso: string) => new Date(`${iso}T12:00:00+05:30`).toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", timeZone: "Asia/Kolkata" });

// Live weather for the main towns and shrines (Open-Meteo), today and tomorrow.
export default async function WeatherPage() {
  const towns = await getTownWeather();
  return (
    <Screen icon="weather" title="Weather Updates" subtitle="Rain, snow and temperature for today and tomorrow.">
      {!towns && <p className="rounded-2xl bg-mint p-4 text-center">Weather is unavailable right now (Open-Meteo). Try again in a few minutes.</p>}
      <ul className="flex flex-col gap-3">
        {towns?.map((t) => (
          <li key={t.name} className="rounded-3xl border border-ink/10 p-4 shadow-sm">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-lg font-semibold">{t.name}</h2>
              <p className="font-display text-2xl font-bold">
                {t.nowC}°C <span className="text-sm font-normal text-muted">{sky(t.code)}</span>
              </p>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              {t.days.map((d) => (
                <p key={d.date} className="rounded-2xl bg-snow p-2">
                  <b>{day(d.date)}</b>
                  <br />
                  {d.minC}° to {d.maxC}°C
                  <br />
                  Rain {d.rainMm} mm{d.snowCm > 0 ? ` · Snow ${d.snowCm} cm` : ""}
                </p>
              ))}
            </div>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted">Source: Open-Meteo forecast, updated every few minutes.</p>
    </Screen>
  );
}
