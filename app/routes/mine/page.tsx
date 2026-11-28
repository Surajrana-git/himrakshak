"use client";

import { useState } from "react";
import Link from "next/link";
import Screen, { Chips, PRIMARY } from "@/components/Screen";
import Icon from "@/components/Icon";
import { useAuth } from "@/lib/auth";
import { useSavedRoutes, type SavedRoute } from "@/lib/saved-routes";
import { RISK_STYLE, riskLevel } from "@/lib/risk";

const TABS = ["All Routes", "Car", "Bus", "Bike", "Walk"] as const;
const MODE_LABEL: Record<string, (typeof TABS)[number]> = { auto: "Car", bus: "Bus", motorcycle: "Bike", pedestrian: "Walk" };
const link = (r: SavedRoute) => `/?trip=${[r.from_lat, r.from_lon, r.to_lat, r.to_lon, r.mode].join(",")}|${encodeURIComponent(r.from_name)}|${encodeURIComponent(r.to_name)}`;

export default function MyRoutesPage() {
  const { user, ready } = useAuth();
  const { routes, error, remove } = useSavedRoutes(user?.id ?? null);
  const [tab, setTab] = useState<(typeof TABS)[number]>("All Routes");
  const shown = routes.filter((r) => tab === "All Routes" || MODE_LABEL[r.mode] === tab);

  return (
    <Screen
      icon="map"
      title="My Routes"
      subtitle="View, manage, and navigate your saved routes."
      footer={
        <Link href="/?plan" className={PRIMARY}>
          <Icon name="plus" /> Create a Route
        </Link>
      }
    >
      {ready && !user && (
        <p className="rounded-2xl bg-mint p-4 text-center">
          <Link href="/login" className="font-semibold text-green underline">
            Sign in
          </Link>{" "}
          to save routes and see them here.
        </p>
      )}
      <Chips options={TABS} value={tab} onChange={setTab} label="Route type" />
      {error && <p className="text-sm text-muted">{error}</p>}
      {user && shown.length === 0 && <p className="rounded-2xl bg-mint p-4 text-center">No saved routes yet. Plan a trip and tap Save Route.</p>}
      <ul className="flex flex-col gap-3">
        {shown.map((r) => {
          const level = riskLevel(r.risk);
          return (
            <li key={r.id} className="rounded-2xl border border-ink/10 p-3 shadow-sm">
              <Link href={link(r)} className="block">
                <b className="font-display text-lg">{r.name}</b>
                <span className="mt-1 flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-full bg-mint px-2 py-0.5 text-green-dark">{MODE_LABEL[r.mode] ?? "Car"}</span>
                  <span className="rounded-full px-2 py-0.5" style={{ background: RISK_STYLE[level].color, color: RISK_STYLE[level].text }}>
                    {RISK_STYLE[level].label} when saved
                  </span>
                </span>
                <span className="mt-2 grid grid-cols-2 text-sm">
                  <span>
                    <b>{r.km.toFixed(1)} km</b> <span className="text-muted">Distance</span>
                  </span>
                  <span>
                    <b>
                      {Math.floor(r.hours)} hr {Math.round((r.hours % 1) * 60)} min
                    </b>{" "}
                    <span className="text-muted">Est. Time</span>
                  </span>
                </span>
              </Link>
              <button onClick={() => remove(r.id)} className="mt-2 min-h-10 text-sm font-semibold text-danger">
                Remove
              </button>
            </li>
          );
        })}
      </ul>
    </Screen>
  );
}
