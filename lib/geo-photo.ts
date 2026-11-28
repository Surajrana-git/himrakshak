"use client";

import type { PlaceName } from "@/lib/geocode";

export type StampInfo = { lat: number; lon: number; at: Date; place: PlaceName | null };
export type StampImages = { tile: HTMLImageElement | null; logo: HTMLImageElement | null };

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

// The satellite tile under the point (Esri World Imagery, same as the map's satellite layer)
// and where the point sits inside it (0–1), for the little map on the stamp.
export function tileFor(lat: number, lon: number): { url: string; fx: number; fy: number } {
  const n = 2 ** TILE_ZOOM;
  const x = ((lon + 180) / 360) * n;
  const r = (lat * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n;
  return {
    url: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${TILE_ZOOM}/${Math.floor(y)}/${Math.floor(x)}`,
    fx: x % 1,
    fy: y % 1,
  };
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
  return `${day.replace(" ", ", ")} ${time} GMT +05:30`;
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
  if (images.tile) {
    const { fx, fy } = tileFor(info.lat, info.lon);
    // Tile scaled 2x and shifted so the pin sits in the middle of the square.
    const size = map * 2;
    ctx.drawImage(images.tile, 2 * u + map / 2 - fx * size, top + map / 2 - fy * size, size, size);
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
  const tagW = 34 * u;
  ctx.fillStyle = "rgba(20, 35, 31, 0.85)";
  ctx.beginPath();
  ctx.roundRect(w - 2 * u - tagW, top - tagH - 1 * u, tagW, tagH, 1.2 * u);
  ctx.fill();
  if (images.logo) ctx.drawImage(images.logo, w - 2 * u - tagW + 0.8 * u, top - tagH - 0.4 * u, 3.8 * u, 3.8 * u);
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${2.6 * u}px Poppins, Inter, sans-serif`;
  ctx.fillText("Himrakshak Geo Cam", w - 2 * u - tagW + 5.4 * u, top - tagH / 2 - 1 * u);

  const pad = 2 * u;
  const textW = boxW - 2 * pad;
  ctx.textBaseline = "top";
  let y = top + 1.6 * u;
  ctx.font = `700 ${4 * u}px Poppins, Inter, sans-serif`;
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
