import { cacheLife } from "next/cache";
import { UTTARAKHAND } from "@/lib/area";
import type { Place } from "@/lib/trip";

type PhotonFeature = {
  geometry: { coordinates: [number, number] };
  properties: { name?: string; state?: string; county?: string; city?: string; district?: string; osm_value?: string; street?: string; postcode?: string };
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

export type PlaceName = { title: string; address: string };

// The place name under a GPS point, for the Geo Cam stamp ("Selakui, Uttarakhand, India").
export async function placeAt(lat: number, lon: number): Promise<PlaceName | null> {
  "use cache";
  cacheLife("days");

  const res = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lon}&lang=en`).catch(() => null);
  if (!res?.ok) return null;
  const { features }: { features: PhotonFeature[] } = await res.json();
  const p = features[0]?.properties;
  if (!p) return null;
  const town = p.city ?? p.district ?? p.county ?? p.name;
  const title = [town, p.state ?? "Uttarakhand", "India"].filter(Boolean).join(", ");
  const parts = [p.name, p.street, p.district, p.city, p.county].filter((x, i, all): x is string => !!x && all.indexOf(x) === i);
  const address = `${parts.join(", ")}${p.state ? `, ${p.state}` : ""}${p.postcode ? ` ${p.postcode}` : ""}, India`;
  return { title, address };
}
