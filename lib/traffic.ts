import { cacheLife } from "next/cache";

export type SegmentFlow = {
  currentKmh: number;
  freeFlowKmh: number;
  closed: boolean;
};

// enabled false: no TOMTOM_API_KEY, so the app relies on driver jam reports only.
export type TrafficFeed = { enabled: false } | { enabled: true; flows: (SegmentFlow | null)[]; fetchedAt: string };

type TomTomFlow = {
  flowSegmentData?: { currentSpeed: number; freeFlowSpeed: number; roadClosure: boolean };
};

// Live speed vs normal speed at the middle of each stretch (TomTom Traffic Flow, free tier).
// One call per stretch; refreshed every 15 min ≈ 900 calls a day, inside the free daily quota.
export async function getTraffic(points: { lat: number; lon: number }[]): Promise<TrafficFeed> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 900, expire: 3600 });

  const key = process.env.TOMTOM_API_KEY;
  if (!key) return { enabled: false };

  const flows = await Promise.all(
    points.map(async ({ lat, lon }) => {
      const url = `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?point=${lat},${lon}&unit=KMPH&key=${key}`;
      const res = await fetch(url);
      if (!res.ok) return null; // one bad stretch shows "no data", the rest still work
      const data: TomTomFlow = await res.json();
      const flow = data.flowSegmentData;
      return flow ? { currentKmh: flow.currentSpeed, freeFlowKmh: flow.freeFlowSpeed, closed: flow.roadClosure } : null;
    }),
  );
  return { enabled: true, flows, fetchedAt: new Date().toISOString() };
}
