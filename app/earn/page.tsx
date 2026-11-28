"use client";

import Screen, { MenuRow } from "@/components/Screen";
import Icon from "@/components/Icon";
import HillsArt from "@/components/HillsArt";
import { useRewards } from "@/lib/rewards";

const STEPS = [
  ["camera", "Report or post", "With a Geo Cam photo"],
  ["check", "Get approved", "AI check or a second phone"],
  ["coin", "Earn ₹", "1 point = ₹1"],
] as const;

export default function EarnPage() {
  const r = useRewards();
  const points = r?.points ?? 0;
  const next = r?.next ?? null;
  const progress = next ? Math.min(100, Math.round((points / next) * 100)) : 100;

  return (
    <Screen icon="coin" title="Earn" subtitle="Contribute to the community and earn rewards.">
      <section className="rounded-3xl bg-green p-5 text-white shadow-md">
        <p className="text-sm font-semibold opacity-90">Total earned</p>
        <p className="font-display text-5xl font-bold">₹{points}</p>
        <p className="mt-1 font-semibold">{r?.level ?? "New reporter"}</p>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/25" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-white" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-1 text-sm opacity-90">{next ? `₹${next - points} more to the next level` : "Top level reached"}</p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          {[
            [r?.activities.filter((a) => a.status === "Approved").length ?? 0, "Approved"],
            [`₹${r?.pending ?? 0}`, "Waiting"],
            [r?.photos ?? 0, "Photos"],
          ].map(([v, l]) => (
            <div key={l} className="rounded-2xl bg-white/15 py-2">
              <p className="font-display text-xl font-bold">{v}</p>
              <p className="text-xs">{l}</p>
            </div>
          ))}
        </div>
      </section>
      <MenuRow icon="gift" title="My Rewards" subtitle="View your earned rewards." href="/earn/rewards" />
      <MenuRow icon="chart" title="Contribution History" subtitle="Your activities and points." href="/earn/history" />
      <MenuRow icon="star" title="How to Earn" subtitle="Learn ways to earn." href="/earn/how" />
      <section className="grid grid-cols-3 gap-2 text-center">
        {STEPS.map(([icon, title, hint], i) => (
          <div key={title} className="rounded-2xl bg-mint p-3">
            <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white text-green">
              <Icon name={icon} className="h-5 w-5" />
            </span>
            <p className="mt-1 text-sm font-semibold">
              {i + 1}. {title}
            </p>
            <p className="text-xs text-muted">{hint}</p>
          </div>
        ))}
      </section>
      <HillsArt />
    </Screen>
  );
}
