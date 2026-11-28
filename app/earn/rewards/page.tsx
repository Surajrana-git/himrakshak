"use client";

import Screen from "@/components/Screen";
import ActivityList from "@/components/ActivityList";
import { useRewards } from "@/lib/rewards";

const TABS = ["All Activity", "Approved", "Pending"] as const;

export default function MyRewardsPage() {
  const r = useRewards();
  return (
    <Screen icon="gift" title="My Rewards" subtitle="Track your earnings, approvals, and contributions.">
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          ["Total Earned", `₹${r?.points ?? 0}`],
          ["Waiting for Approval", `₹${r?.pending ?? 0}`],
          ["Photos Uploaded", `${r?.photos ?? 0}`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-ink/10 p-2 shadow-sm">
            <p className="text-xs text-muted">{label}</p>
            <p className="mt-1 rounded-xl bg-mint py-1 font-display text-xl font-bold text-green-dark">{value}</p>
          </div>
        ))}
      </div>
      <ActivityList activities={r?.activities ?? []} tabs={TABS} match={(a, t) => t === "All Activity" || a.status === t} money />
      <p className="text-center text-xs text-muted">1 point = ₹1. A road report is approved when a driver on another phone reports the same spot.</p>
    </Screen>
  );
}
