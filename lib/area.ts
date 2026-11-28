// Uttarakhand's bounding box. Routing, search and the slope grid cover this area only.
export const UTTARAKHAND = { south: 28.7, north: 31.5, west: 77.5, east: 81.1 };

export function inUttarakhand(lat: number, lon: number): boolean {
  return lat > UTTARAKHAND.south && lat < UTTARAKHAND.north && lon > UTTARAKHAND.west && lon < UTTARAKHAND.east;
}
