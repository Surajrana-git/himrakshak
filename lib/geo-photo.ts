"use client";

export type PhotoFix = { lat: number; lon: number; accuracyM: number; at: Date; near: string | null };

// A camera shot reaches the app seconds after it is taken; a gallery photo carries its old date.
const FRESH_MS = 3 * 60_000;
const MAX_SIDE = 1600;

export function isFreshCapture(file: File): boolean {
  return Date.now() - file.lastModified < FRESH_MS;
}

// GPS at the moment of the shot, so the photo cannot claim another place.
export function currentFix(): Promise<GeolocationCoordinates> {
  return new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(
      (p) => resolve(p.coords),
      () => reject(new Error("Turn on location to add a photo. A report photo must show where it was taken.")),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    ),
  );
}

// Burns place and time into the picture (like a GPS camera app), so it travels with the photo.
export async function stampPhoto(file: File, fix: PhotoFix): Promise<File> {
  const image = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(image.width, image.height));
  const w = Math.round(image.width * scale);
  const h = Math.round(image.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(image, 0, 0, w, h);

  const time = fix.at.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
  const lines = [
    "Himrakshak · live camera",
    `${fix.lat.toFixed(5)}° N, ${fix.lon.toFixed(5)}° E  (±${Math.round(fix.accuracyM)} m)`,
    ...(fix.near ? [fix.near] : []),
    `${time} IST`,
  ];
  const size = Math.max(16, Math.round(w / 36));
  const pad = Math.round(size * 0.7);
  const band = lines.length * size * 1.35 + pad * 2;
  ctx.fillStyle = "rgba(20, 35, 31, 0.72)";
  ctx.fillRect(0, h - band, w, band);
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "top";
  lines.forEach((line, i) => {
    ctx.font = `${i === 0 ? "700" : "500"} ${size}px Inter, sans-serif`;
    ctx.fillText(line, pad, h - band + pad + i * size * 1.35);
  });

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) throw new Error("Could not prepare the photo");
  return new File([blob], `report-${fix.at.getTime()}.jpg`, { type: "image/jpeg" });
}
