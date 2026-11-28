import { cacheLife } from "next/cache";
import { UTTARAKHAND } from "@/lib/area";
import type { Place } from "@/lib/trip";

type PhotonFeature = {
  geometry: { coordinates: [number, number] };
  properties: { name?: string; state?: string; county?: string; city?: string; district?: string; osm_value?: string };
};

// Any village, town, hotel or temple in Uttarakhand by name: Photon (OpenStreetMap search by
// Komoot, free, no key). Results outside the state are dropped. Empty list if Photon is down.
export async function searchPlaces(query: string): Promise<Place[]> {
  "use cache";
  cacheLife("days");

  const { west, south, east, north } = UTTARAKHAND;
  const params = new URLSearchParams({ q: query, limit: "8", lang: "en", bbox: `${west},${south},${east},${north}` });
  const res = await fetch(`https://photon.komoot.io/api/?${params}`).catch(() => null);
  if (!res?.ok) return [];
  const { features }: { features: PhotonFeature[] } = await res.json();
  return features
    .filter((f) => f.properties.state === "Uttarakhand" && f.properties.name)
    .map((f) => {
      const area = f.properties.city ?? f.properties.county ?? f.properties.district;
      const [lon, lat] = f.geometry.coordinates;
      return { name: area && area !== f.properties.name ? `${f.properties.name}, ${area}` : f.properties.name!, hindi: "", lat, lon, dham: false };
    })
    .filter((p, i, all) => all.findIndex((o) => o.name === p.name) === i)
    .slice(0, 6);
}
