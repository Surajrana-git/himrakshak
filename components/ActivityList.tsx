"use client";

import { useState } from "react";
import { Chips } from "@/components/Screen";
import Icon from "@/components/Icon";
import type { Activity } from "@/lib/rewards";

const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

// One activity row per report or post, with its points (shown as ₹ or pts) and status.
export default function ActivityList<T extends string>({ activities, tabs, match, money }: { activities: Activity[]; tabs: readonly T[]; match: (a: Activity, tab: T) => boolean; money: boolean }) {
  const [tab, setTab] = useState<T>(tabs[0]);
  const shown = activities.filter((a) => match(a, tab));
  return (
    <>
      <Chips options={tabs} value={tab} onChange={setTab} label="Filter" />
      <p className="text-right text-sm text-muted">Last 90 days</p>
      {shown.length === 0 && <p className="rounded-2xl bg-mint p-4 text-center">Nothing yet. Report a road problem or post on the map to earn.</p>}
      <ul className="flex flex-col gap-2">
        {shown.map((a) => (
          <li key={a.id} className="flex items-center gap-3 rounded-2xl border border-ink/10 p-2 shadow-sm">
            {a.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.photo} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
            ) : (
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-mint text-green">
                <Icon name={a.group === "Hazard Report" ? "hazard" : a.group === "Weather Update" ? "weather" : "pin"} />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <b className="block truncate">{a.title}</b>
              <span className="block text-xs text-muted">
                {when(a.at)} · #{a.id.slice(0, 8)}
              </span>
            </span>
            <span className="text-right">
              <span className={`block rounded-full px-2 text-xs font-bold ${a.status === "Approved" ? "bg-mint text-green-dark" : "bg-orange/20 text-ink"}`}>{a.status}</span>
              <b className="text-green-dark">{money ? `₹${a.points}` : `+${a.points} pts`}</b>
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
