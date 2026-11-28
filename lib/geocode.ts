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

type NominatimPlace = {
  display_name?: string;
  address?: { village?: string; hamlet?: string; town?: string; city?: string; suburb?: string; county?: string; state?: string };
};

// The place name under a GPS point, for the Geo Cam stamp ("Central Hope Town, Uttarakhand").
// OpenStreetMap's Nominatim first (full address), Photon if it is busy. Not cached, so a
// failed lookup is simply tried again on the next shot.
export async function placeAt(lat: number, lon: number): Promise<PlaceName | null> {
  const headers = { "User-Agent": "Himrakshak road safety app" };
  const nominatim = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=jsonv2&zoom=17&accept-language=en`, { headers })
    .then((res) => (res.ok ? (res.json() as Promise<NominatimPlace>) : null))
    .catch(() => null);
  if (nominatim?.display_name && nominatim.address) {
    const a = nominatim.address;
    const town = a.town ?? a.city ?? a.village ?? a.suburb ?? a.hamlet ?? a.county;
    return { title: [town, a.state ?? "Uttarakhand"].filter(Boolean).join(", "), address: nominatim.display_name };
  }

  const res = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lon}&lang=en`, { headers }).catch(() => null);
  if (!res?.ok) return null;
  const { features }: { features: PhotonFeature[] } = await res.json();
  const p = features[0]?.properties;
  if (!p) return null;
  const town = p.city ?? p.district ?? p.county ?? p.name;
  const parts = [p.name, p.street, p.district, p.city, p.county].filter((x, i, all): x is string => !!x && all.indexOf(x) === i);
  return {
    title: [town, p.state ?? "Uttarakhand"].filter(Boolean).join(", "),
    address: `${parts.join(", ")}${p.state ? `, ${p.state}` : ""}${p.postcode ? ` ${p.postcode}` : ""}, India`,
  };
}

export type Hotel = { name: string; kind: string; address: string; lat: number; lon: number };

// Hotels, guest houses and hostels near a point, from OpenStreetMap (Photon). Empty if Photon is down.
export async function hotelsNear(lat: number, lon: number): Promise<Hotel[]> {
  "use cache";
  cacheLife("hours");

  const params = new URLSearchParams({ q: "hotel", lat: String(lat), lon: String(lon), limit: "20", lang: "en", bbox: `${lon - 0.4},${lat - 0.4},${lon + 0.4},${lat + 0.4}` });
  ["tourism:hotel", "tourism:guest_house", "tourism:hostel", "tourism:motel"].forEach((t) => params.append("osm_tag", t));
  const res = await fetch(`https://photon.komoot.io/api/?${params}`).catch(() => null);
  if (!res?.ok) return [];
  const { features }: { features: PhotonFeature[] } = await res.json();
  return features
    .filter((f) => f.properties.name)
    .map((f) => {
      const p = f.properties;
      const [hLon, hLat] = f.geometry.coordinates;
      return {
        name: p.name!,
        kind: (p.osm_value ?? "hotel").replace("_", " "),
        address: [p.street, p.district, p.city, p.state].filter(Boolean).join(", "),
        lat: hLat,
        lon: hLon,
      };
    });
}
