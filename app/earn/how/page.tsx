import Link from "next/link";
import Screen from "@/components/Screen";

const WAYS = [
  ["Report a road problem", "+10", "Landslide, rockfall, blocked road, water or a jam, from where you are."],
  ["Get your report confirmed", "+20", "When a driver on another phone reports the same spot within 1 km and 12 hours."],
  ["Post on the map", "+10", "A road condition, weather or safety update. +10 more with a Geo Cam photo."],
  ["Add a place or fix the map", "+10", "Shelters, hospitals, fuel, closed roads. +10 more with a Geo Cam photo."],
];

export default function HowToEarnPage() {
  return (
    <Screen icon="star" title="How to Earn" subtitle="Every true report makes the road safer for the next car.">
      <ul className="flex flex-col gap-3">
        {WAYS.map(([title, pts, how]) => (
          <li key={title} className="flex items-center gap-3 rounded-2xl border border-ink/10 p-3 shadow-sm">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-mint font-display text-lg font-bold text-green-dark">{pts}</span>
            <span>
              <b>{title}</b>
              <span className="block text-sm text-muted">{how}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="rounded-2xl bg-mint p-4 text-sm">
        1 point = ₹1. Photos must come from the Himrakshak Geo Cam; the AI rejects screenshots and gallery photos, so fake reports earn nothing.
      </p>
      <Link href="/post" className="flex min-h-14 items-center justify-center rounded-full bg-green font-display text-lg font-semibold text-white">
        Post on Map now
      </Link>
    </Screen>
  );
}
