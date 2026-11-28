"use client";

import type { PlaceName } from "@/lib/geocode";

export type StampInfo = { lat: number; lon: number; at: Date; place: PlaceName | null };
// tiles: the 3×3 satellite tiles around the point (dx, dy = -1…1), so the little map has no gaps.
export type StampImages = { tiles: { img: HTMLImageElement; dx: number; dy: number }[]; logo: HTMLImageElement | null };

const TILE_ZOOM = 17;

export function currentFix(): Promise<GeolocationCoordinates> {
  return new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(
      (p) => resolve(p.coords),
      () => reject(new Error("Could not get your location. Turn on location and try again.")),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    ),
  );
}

// Where the point sits in the satellite tile grid (Esri World Imagery, same as the map's satellite layer).
function tilePosition(lat: number, lon: number): { x: number; y: number } {
  const n = 2 ** TILE_ZOOM;
  const r = (lat * Math.PI) / 180;
  return { x: ((lon + 180) / 360) * n, y: ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n };
}

export function tileUrls(lat: number, lon: number): { url: string; dx: number; dy: number }[] {
  const { x, y } = tilePosition(lat, lon);
  const out = [];
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++)
      out.push({
        url: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${TILE_ZOOM}/${Math.floor(y) + dy}/${Math.floor(x) + dx}`,
        dx,
        dy,
      });
  return out;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // so the photo canvas can still be saved
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function fit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
  return `${t}…`;
}

function timeLine(at: Date): string {
  const day = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" }).format(at);
  const time = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit" }).format(at);
  return `${day} ${time} GMT +05:30`;
}

// Draws the Himrakshak Geo Cam stamp at the bottom of a w×h picture. The live preview and the
// saved photo both use this, so what the driver sees is exactly what gets sent.
export function drawStamp(ctx: CanvasRenderingContext2D, w: number, h: number, info: StampInfo, images: StampImages) {
  const u = w / 100; // every size is a share of the width
  const panelH = 25 * u;
  const top = h - panelH - 2 * u;
  const map = panelH;
  const boxX = 2 * u + map + 1.5 * u;
  const boxW = w - boxX - 2 * u;

  // Little satellite map with a red pin.
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(2 * u, top, map, map, 2 * u);
  ctx.clip();
  ctx.fillStyle = "#14231F";
  ctx.fillRect(2 * u, top, map, map);
  const { x, y: ty } = tilePosition(info.lat, info.lon);
  const size = map * 1.5; // one tile, ~300 m across
  for (const t of images.tiles) {
    // Shifted so the point sits in the middle of the square.
    ctx.drawImage(t.img, 2 * u + map / 2 + (t.dx - (x % 1)) * size, top + map / 2 + (t.dy - (ty % 1)) * size, size, size);
  }
  ctx.restore();
  const pinX = 2 * u + map / 2;
  const pinY = top + map / 2;
  ctx.fillStyle = "#B03030";
  ctx.beginPath();
  ctx.arc(pinX, pinY - 2.2 * u, 1.8 * u, Math.PI, 0);
  ctx.lineTo(pinX, pinY);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(pinX, pinY - 2.2 * u, 0.7 * u, 0, Math.PI * 2);
  ctx.fill();

  // Text box.
  ctx.fillStyle = "rgba(20, 35, 31, 0.72)";
  ctx.beginPath();
  ctx.roundRect(boxX, top, boxW, panelH, 2 * u);
  ctx.fill();

  // Logo tag above the box, like a camera app's badge.
  const tagH = 5 * u;
  const tagW = 36 * u;
  ctx.fillStyle = "rgba(20, 35, 31, 0.85)";
  ctx.beginPath();
  ctx.roundRect(w - 2 * u - tagW, top - tagH - 1 * u, tagW, tagH, 1.2 * u);
  ctx.fill();
  if (images.logo) {
    // The logo is dark ink, so it sits on a white tile to show on the dark badge.
    const lx = w - 2 * u - tagW + 0.6 * u;
    const ly = top - tagH - 0.6 * u;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.roundRect(lx, ly, 4.2 * u, 4.2 * u, 0.8 * u);
    ctx.fill();
    ctx.drawImage(images.logo, lx + 0.2 * u, ly + 0.2 * u, 3.8 * u, 3.8 * u);
  }
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${2.6 * u}px Poppins, Inter, sans-serif`;
  ctx.fillText("Himrakshak Geo Cam", w - 2 * u - tagW + 5.4 * u, top - tagH / 2 - 1 * u);

  const pad = 2 * u;
  const textW = boxW - 2 * pad;
  ctx.textBaseline = "top";
  let y = top + 1.6 * u;
  ctx.font = `700 ${3.6 * u}px Poppins, Inter, sans-serif`;
  ctx.fillText(fit(ctx, info.place?.title ?? "Uttarakhand, India", textW), boxX + pad, y);
  y += 5.6 * u;
  ctx.font = `500 ${2.6 * u}px Inter, sans-serif`;
  const lines = [
    info.place?.address ?? "Finding the place name…",
    `Lat ${info.lat.toFixed(6)}°  Long ${info.lon.toFixed(6)}°`,
    timeLine(info.at),
    "Note : Captured by Himrakshak Geo Cam",
  ];
  for (const line of lines) {
    ctx.fillText(fit(ctx, line, textW), boxX + pad, y);
    y += 3.9 * u;
  }
}
