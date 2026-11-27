// Google Maps URLs (free, no API key): hand a route or a location to the Google Maps app.
// https://developers.google.com/maps/documentation/urls/get-started

const fmt = (lat: number, lon: number) => `${lat.toFixed(5)},${lon.toFixed(5)}`;

// Google picks its own fastest road unless told otherwise, so we pass points along OUR chosen
// (safest) route as waypoints. Google allows up to 9 waypoints in a URL.
export function googleDirectionsUrl(coordinates: number[][]): string {
  const [startLon, startLat] = coordinates[0];
  const [endLon, endLat] = coordinates[coordinates.length - 1];
  const waypoints = Array.from({ length: 8 }, (_, i) => {
    const [lon, lat] = coordinates[Math.floor(((i + 1) * (coordinates.length - 1)) / 9)];
    return fmt(lat, lon);
  });
  const params = new URLSearchParams({
    api: "1",
    origin: fmt(startLat, startLon),
    destination: fmt(endLat, endLon),
    travelmode: "driving",
    waypoints: waypoints.join("|"),
  });
  return `https://www.google.com/maps/dir/?${params}`;
}

export function googlePlaceUrl(lat: number, lon: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${fmt(lat, lon)}`;
}
