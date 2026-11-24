"use client";

import { useState } from "react";
import RiskMap, { type MapSegment } from "@/components/RiskMap";
import ReportForm from "@/components/ReportForm";
import { REPORT_KINDS, timeAgo, useReports } from "@/lib/reports";
import { supabase } from "@/lib/supabase";
import { RISK_STYLE, riskLevel, safeDepartureHour, segmentScore, withSimulatedStorm } from "@/lib/risk";
import type { RainSeries } from "@/lib/weather";
import type route from "@/data/route-badrinath.json";

type Props = { route: typeof route; rain: RainSeries };

export default function RiskView({ route, rain }: Props) {
  const reports = useReports();
  const [reporting, setReporting] = useState(false);
  const [stormMm, setStormMm] = useState(0);
  const [stormHours, setStormHours] = useState(3);
  const segmentName = (id: string) => {
    const s = route.segments.find((x) => x.id === id);
    return s ? `${s.from} → ${s.to}` : id;
  };
  const series = withSimulatedStorm(rain.mm, rain.nowIndex, stormMm, stormHours);
  const safeHour = safeDepartureHour(series, rain.nowIndex, route.segments);
  const safeClock = safeHour === null ? null : rain.times[rain.nowIndex + safeHour]?.slice(11, 16);
  const segments: MapSegment[] = route.segments.map((s, i) => {
    const score = segmentScore(series[i], rain.nowIndex, s.slopeFactor, s.historyFactor);
    return { id: s.id, from: s.from, to: s.to, distanceKm: s.distanceKm, coordinates: s.coordinates, score, level: riskLevel(score) };
  });
  const worst = segments.reduce((a, b) => (b.score > a.score ? b : a));
  const worstStyle = RISK_STYLE[worst.level];
  const updated = rain.times[rain.nowIndex]?.replace("T", " ");

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <div className="h-[55dvh] md:h-auto md:flex-1">
        <RiskMap segments={segments} towns={route.towns} reports={reports} />
      </div>

      <aside className="flex flex-col gap-6 p-5 md:w-[420px] md:overflow-y-auto md:h-dvh">
        <header>
          <h1 className="font-display text-4xl font-bold tracking-wide">Himrakshak</h1>
          <p className="text-muted">{route.name}</p>
        </header>

        <section className="bg-ink p-5 text-snow">
          <p className="font-display text-sm uppercase tracking-[0.2em] text-orange">Route ka sabse risky hissa</p>
          <p className="mt-2 font-display text-2xl">
            {worst.from} → {worst.to}
          </p>
          <p className="mt-1 text-lg" style={{ color: worstStyle.color }}>
            {worstStyle.hindi} · {worstStyle.label} ({worst.score}/100)
          </p>
        </section>

        <section className="border-l-8 border-orange-dark bg-white p-5">
          <p className="font-display text-sm uppercase tracking-[0.2em] text-orange-dark">Kab niklein? / When to leave</p>
          {safeHour === 0 && (
            <>
              <p className="mt-2 font-display text-3xl">Abhi nikal sakte hain</p>
              <p className="text-muted">Poore route pe koi hissa high risk mein nahi hai.</p>
            </>
          )}
          {safeHour !== null && safeHour > 0 && (
            <>
              <p className="mt-2 font-display text-3xl">{safeClock} ke baad niklein</p>
              <p className="text-muted">
                Leave after {safeClock} ({safeHour} ghante baad). Tab tak kam se kam ek hissa high risk mein hai.
              </p>
            </>
          )}
          {safeHour === null && (
            <>
              <p className="mt-2 font-display text-3xl text-danger">Agle 12 ghante yatra na karein</p>
              <p className="text-muted">Avoid travel: the route stays high risk for the next 12 hours.</p>
            </>
          )}
        </section>

        <button
          onClick={() => setReporting(true)}
          disabled={!supabase}
          className="min-h-14 bg-orange px-4 font-display text-xl tracking-wide text-ink disabled:opacity-50"
        >
          Rasta report karein
        </button>
        {!supabase && (
          <p className="text-sm text-muted">Reports band hain: Supabase keys `.env.local` mein nahi hain.</p>
        )}

        {reports.length > 0 && (
          <section>
            <h2 className="font-display text-xl">Taaza reports / Live reports</h2>
            <ul className="mt-3 divide-y divide-ink/15 border-y border-ink/15">
              {reports.slice(0, 8).map((r) => (
                <li key={r.id} className="py-3">
                  <p className="font-semibold">
                    {REPORT_KINDS[r.kind].hindi} · {REPORT_KINDS[r.kind].label}
                  </p>
                  <p className="text-sm text-muted">
                    {segmentName(r.segment_id)} · {timeAgo(r.created_at)}
                    {r.photo_url ? " · photo" : ""}
                  </p>
                  {r.note && <p className="mt-1">{r.note}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h2 className="font-display text-xl">Har hissa / Every stretch</h2>
          <ul className="mt-3 divide-y divide-ink/15 border-y border-ink/15">
            {segments.map((s) => {
              const style = RISK_STYLE[s.level];
              return (
                <li key={s.id} className="flex min-h-14 items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-semibold">
                      {s.from} → {s.to}
                    </p>
                    <p className="text-sm text-muted">{s.distanceKm} km</p>
                  </div>
                  <p className="shrink-0 px-3 py-1 text-sm font-semibold text-ink" style={{ backgroundColor: style.color }}>
                    {style.label} · {s.score}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="border-2 border-dashed border-ink/30 p-4">
          <h2 className="font-display text-xl">Demo: baarish simulate karein</h2>
          <p className="text-sm text-muted">Simulation only. Live data mein yeh baarish nahi hai.</p>
          <label className="mt-3 flex flex-col gap-1">
            <span className="font-semibold">Toofan: {stormMm} mm / ghanta</span>
            <input type="range" min={0} max={20} value={stormMm} onChange={(e) => setStormMm(Number(e.target.value))} className="accent-orange-dark" />
          </label>
          <label className="mt-3 flex flex-col gap-1">
            <span className="font-semibold">Agle {stormHours} ghante tak</span>
            <input type="range" min={1} max={8} value={stormHours} onChange={(e) => setStormHours(Number(e.target.value))} className="accent-orange-dark" />
          </label>
        </section>

        <footer className="text-sm text-muted">
          Live rain: Open-Meteo · Updated {updated} IST · Roads: OpenStreetMap
        </footer>
      </aside>

      {reporting && <ReportForm segments={route.segments} onClose={() => setReporting(false)} />}
    </div>
  );
}
