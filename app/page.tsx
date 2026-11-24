import { Suspense } from "react";
import route from "@/data/route-badrinath.json";
import { getRain } from "@/lib/weather";
import RiskView from "@/components/RiskView";

export default function Page() {
  return (
    <main className="flex min-h-dvh flex-col bg-snow text-ink">
      <Suspense fallback={<p className="p-6 text-lg">Live rain data aa raha hai…</p>}>
        <LiveRisk />
      </Suspense>
    </main>
  );
}

async function LiveRisk() {
  const rain = await getRain(route.segments.map((s) => s.rainPoint)).catch(() => null);
  if (!rain) {
    return (
      <p className="p-6 text-lg">
        Weather data abhi nahi mil raha (Open-Meteo). Internet check karke page reload karein.
      </p>
    );
  }
  return <RiskView route={route} rain={rain} />;
}
