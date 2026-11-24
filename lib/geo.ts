// Distance in km between two points (haversine).
export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

// The road segment closest to a GPS point, and how far away it is.
export function nearestSegment(
  lat: number,
  lon: number,
  segments: { id: string; coordinates: number[][] }[],
): { id: string; km: number } {
  let best = { id: segments[0].id, km: Infinity };
  for (const s of segments) {
    for (const [x, y] of s.coordinates) {
      const km = distanceKm(lat, lon, y, x);
      if (km < best.km) best = { id: s.id, km };
    }
  }
  return best;
}
