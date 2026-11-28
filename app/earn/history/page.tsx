"use client";

import Screen from "@/components/Screen";
import ActivityList from "@/components/ActivityList";
import { useRewards } from "@/lib/rewards";

const TABS = ["All Activity", "Hazard Report", "Weather Update", "Location Share"] as const;

export default function HistoryPage() {
  const r = useRewards();
  return (
    <Screen icon="chart" title="Contribution History" subtitle="Track your activities and earned points.">
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          [`${r?.activities.length ?? 0}`, "Total Contributions"],
          [`+${r?.points ?? 0}`, "Total Points Earned"],
          [`${r?.photos ?? 0}`, "Photos Uploaded"],
        ].map(([value, label]) => (
          <div key={label} className="rounded-2xl border border-ink/10 p-3 shadow-sm">
            <p className="font-display text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted">{label}</p>
          </div>
        ))}
      </div>
      <ActivityList activities={r?.activities ?? []} tabs={TABS} match={(a, t) => t === "All Activity" || a.group === t} money={false} />
      <p className="text-center text-sm text-muted">Note: 1 point = 1 rupee</p>
    </Screen>
  );
}
