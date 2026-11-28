"use client";

import { useState } from "react";
import Link from "next/link";
import Icon, { type IconName } from "@/components/Icon";
import { REPORT_KINDS, timeAgo, useReports, type Report } from "@/lib/reports";
import { nearestPlace } from "@/lib/trip";

type WeatherAlert = { town: string; date: string; amount: string };
type Props = { rain: WeatherAlert[]; snow: WeatherAlert[]; weatherDown: boolean };

const SLIDE: Report["kind"][] = ["landslide", "rockfall", "road_blocked"];
const day = (iso: string) => new Date(`${iso}T12:00:00+05:30`).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });

export default function AlertsList({ rain, snow, weatherDown }: Props) {
  const reports = useReports();
  const [open, setOpen] = useState<string | null>(null);
  const slides = reports.filter((r) => SLIDE.includes(r.kind));
  const floods = reports.filter((r) => r.kind === "water");
  const top = slides[0] ?? floods[0];

  const reportLines = (list: Report[]) => list.map((r) => `${REPORT_KINDS[r.kind].label} near ${nearestPlace(r).name} · ${timeAgo(r.created_at)}`);
  const groups: { id: string; icon: IconName; title: string; hint: string; lines: string[] }[] = [
    { id: "slide", icon: "hazard", title: "Landslide", hint: "Road blockage or land movement.", lines: reportLines(slides) },
    { id: "rain", icon: "weather", title: "Heavy Rain", hint: "Intense rainfall, risk of flooding.", lines: rain.map((a) => `${a.town}: ${a.amount} on ${day(a.date)}`) },
    { id: "snow", icon: "weather", title: "Snowfall", hint: "Moderate to heavy snowfall alert.", lines: snow.map((a) => `${a.town}: ${a.amount} on ${day(a.date)}`) },
    { id: "flood", icon: "hazard", title: "Flood", hint: "Rising water level in nearby areas.", lines: reportLines(floods) },
  ];

  return (
    <>
      {top ? (
        <section className="rounded-3xl bg-danger/10 p-4">
          <h2 className="flex items-center gap-2 font-display text-xl font-bold text-danger">
            <Icon name="hazard" /> {REPORT_KINDS[top.kind].label} Alert
          </h2>
          <p className="mt-1">
            Reported near {nearestPlace(top).name}. {top.note ?? "Avoid travel if you can."}
          </p>
          <p className="mt-1 text-sm text-muted">{timeAgo(top.created_at)}</p>
        </section>
      ) : (
        <p className="rounded-3xl bg-mint p-4 text-center">No hazard reported by drivers in the last 48 hours.</p>
      )}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">All Alerts</h2>
        <Link href="/" className="flex items-center gap-1 font-semibold text-green">
          <Icon name="map" className="h-5 w-5" /> View on Map
        </Link>
      </div>
      <ul className="flex flex-col gap-2">
        {groups.map((g) => (
          <li key={g.id} className="rounded-2xl border border-ink/10 shadow-sm">
            <button onClick={() => setOpen(open === g.id ? null : g.id)} className="flex min-h-16 w-full items-center gap-3 p-3 text-left">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-mint text-green">
                <Icon name={g.icon} />
              </span>
              <span className="flex-1">
                <b>{g.title}</b> <span className={`text-sm font-semibold ${g.lines.length ? "text-danger" : "text-muted"}`}>· {g.lines.length} now</span>
                <span className="block text-sm text-muted">{g.hint}</span>
              </span>
              <Icon name="chevron" className={`h-5 w-5 text-muted ${open === g.id ? "rotate-90" : ""}`} />
            </button>
            {open === g.id && (
              <ul className="border-t border-ink/10 px-4 py-2 text-sm">
                {g.lines.length === 0 && <li className="py-1 text-muted">{(g.id === "rain" || g.id === "snow") && weatherDown ? "Forecast unavailable right now." : "Nothing right now."}</li>}
                {g.lines.map((l) => (
                  <li key={l} className="py-1">
                    {l}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted">Landslide and flood: driver reports from the last 48 hours. Rain and snow: Open-Meteo forecast for today and tomorrow.</p>
    </>
  );
}
