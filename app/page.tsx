import { Suspense } from "react";
import route from "@/data/route-badrinath.json";
import { getRain } from "@/lib/weather";
import { getSlideNews } from "@/lib/slide-news";
import { getTraffic } from "@/lib/traffic";
import RiskView from "@/components/RiskView";

export default function Page() {
  return (
    <main className="h-dvh bg-snow text-ink">
      <Suspense fallback={<p className="p-6 text-lg">Live rain data aa raha hai…</p>}>
        <LiveRisk />
      </Suspense>
    </main>
  );
}

async function LiveRisk() {
  const [rain, news, traffic] = await Promise.all([
    getRain(route.segments.map((s) => s.rainPoint)).catch(() => null),
    getSlideNews().catch(() => null),
    getTraffic(route.segments.map((s) => s.rainPoint)).catch(() => null),
  ]);
  if (!rain) {
    return (
      <p className="p-6 text-lg">
        Weather data abhi nahi mil raha (Open-Meteo). Internet check karke page reload karein.
      </p>
    );
  }
  return <RiskView route={route} rain={rain} news={news} traffic={traffic} />;
}
