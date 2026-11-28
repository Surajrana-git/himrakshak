"use client";

import { useEffect, useRef, useState } from "react";
import { drawStamp, loadImage, tileUrls, type StampImages } from "@/lib/geo-photo";
import type { PlaceName } from "@/lib/geocode";

type Fix = { lat: number; lon: number };
type Props = { onUse: (photo: File, fix: Fix) => void; onClose: () => void };

const MAX_SIDE = 1600;

// Himrakshak Geo Cam: the camera itself, with place, GPS and time stamped live on the preview
// and burned into the photo. There is no gallery button, so only a photo taken here can be sent.
export default function GeoCamera({ onUse, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState("");
  const [fix, setFix] = useState<Fix | null>(null);
  const [place, setPlace] = useState<PlaceName | null>(null);
  const [images, setImages] = useState<StampImages>({ tiles: [], logo: null });
  const [now, setNow] = useState(() => new Date());
  const [aspect, setAspect] = useState(3 / 4);
  const [shot, setShot] = useState<{ file: File; url: string; fix: Fix } | null>(null);

  // Camera on while this screen is open.
  useEffect(() => {
    let stream: MediaStream | null = null;
    const camera = navigator.mediaDevices
      ? navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false })
      : Promise.reject(new Error("no camera"));
    camera
      .then((s) => {
        stream = s;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = s;
        video.onloadedmetadata = () => setAspect(video.videoWidth / video.videoHeight);
      })
      .catch(() => setError("Allow the camera to take a report photo."));
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, []);

  // Live GPS and a ticking clock for the stamp.
  useEffect(() => {
    const watch = navigator.geolocation.watchPosition(
      ({ coords }) => setFix({ lat: coords.latitude, lon: coords.longitude }),
      () => setError("Turn on location. A report photo must show where it was taken."),
      { enableHighAccuracy: true, maximumAge: 0 },
    );
    const tick = setInterval(() => setNow(new Date()), 1000);
    loadImage("/logo-mark.png")
      .then((logo) => setImages((i) => ({ ...i, logo })))
      .catch(() => {});
    return () => {
      navigator.geolocation.clearWatch(watch);
      clearInterval(tick);
    };
  }, []);

  // Place name and map tile for the ~100 m square the phone is in.
  const cell = fix ? `${fix.lat.toFixed(3)},${fix.lon.toFixed(3)}` : null;
  useEffect(() => {
    if (!cell) return;
    const [lat, lon] = cell.split(",").map(Number);
    fetch(`/api/places?lat=${lat}&lon=${lon}`)
      .then((res) => (res.ok ? res.json() : { place: null }))
      .then((body: { place: PlaceName | null }) => setPlace(body.place))
      .catch(() => {});
    Promise.allSettled(tileUrls(lat, lon).map((t) => loadImage(t.url).then((img) => ({ img, dx: t.dx, dy: t.dy })))).then((results) => {
      const tiles = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
      setImages((i) => ({ ...i, tiles }));
    });
  }, [cell]);

  // Redraw the live stamp over the preview.
  useEffect(() => {
    const canvas = overlayRef.current;
    if (!canvas || !fix) return;
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawStamp(ctx, canvas.width, canvas.height, { ...fix, at: now, place }, images);
  }, [fix, now, place, images, aspect]);

  function capture() {
    const video = videoRef.current;
    if (!video || !fix || !video.videoWidth) return;
    const scale = Math.min(1, MAX_SIDE / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const at = new Date();
    drawStamp(ctx, canvas.width, canvas.height, { ...fix, at, place }, images);
    canvas.toBlob(
      (blob) => {
        if (!blob) return setError("Could not save the photo. Try again.");
        const file = new File([blob], `himrakshak-${at.getTime()}.jpg`, { type: "image/jpeg" });
        setShot({ file, url: URL.createObjectURL(blob), fix });
      },
      "image/jpeg",
      0.88,
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink text-white" role="dialog" aria-label="Himrakshak Geo Cam">
      <header className="flex items-center justify-between p-4 pt-[max(16px,env(safe-area-inset-top))]">
        <h2 className="font-display text-xl font-semibold">Himrakshak Geo Cam</h2>
        <button onClick={onClose} aria-label="Close camera" className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </header>

      <div className="flex min-h-0 flex-1 items-center justify-center">
        <div className="relative max-h-full w-full" style={{ aspectRatio: aspect }}>
          {/* The camera stays on behind the taken photo, so "Retake" is instant. */}
          <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-contain" />
          <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden />
          {shot && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shot.url} alt="Your report photo with place, GPS and time" className="absolute inset-0 h-full w-full bg-ink object-contain" />
          )}
        </div>
      </div>

      {error && <p className="px-4 pb-2 text-center font-semibold text-orange">{error}</p>}

      <footer className="flex items-center justify-center gap-6 p-5 pb-[max(20px,env(safe-area-inset-bottom))]">
        {shot ? (
          <>
            <button
              onClick={() => {
                URL.revokeObjectURL(shot.url);
                setShot(null);
              }}
              className="min-h-14 flex-1 rounded-full border-2 border-white font-semibold"
            >
              Retake
            </button>
            <button onClick={() => onUse(shot.file, shot.fix)} className="min-h-14 flex-1 rounded-full bg-green font-display text-lg font-semibold">
              Use photo
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={capture}
              disabled={!fix || !!error}
              aria-label="Take photo"
              className="h-20 w-20 rounded-full border-4 border-white bg-green disabled:opacity-40"
            />
            <span className="text-sm text-white/80">{fix ? "Tap to take the photo" : "Waiting for GPS…"}</span>
          </div>
        )}
      </footer>
    </div>
  );
}
