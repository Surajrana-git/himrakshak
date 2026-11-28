"use client";

import { useState } from "react";
import GeoCamera from "@/components/GeoCamera";
import Icon from "@/components/Icon";

// Up to `max` photos, each taken in the Himrakshak Geo Cam (place, GPS and time printed on it).
export default function PhotoSlots({ max, photos, onChange }: { max: number; photos: File[]; onChange: (photos: File[]) => void }) {
  const [camera, setCamera] = useState(false);
  const [urls, setUrls] = useState<string[]>([]);

  return (
    <div className="grid grid-cols-3 gap-2">
      {photos.map((p, i) => (
        <div key={i} className="relative aspect-square overflow-hidden rounded-2xl bg-mint">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={urls[i]} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
          <button
            type="button"
            aria-label={`Remove photo ${i + 1}`}
            onClick={() => {
              URL.revokeObjectURL(urls[i]);
              setUrls(urls.filter((_, k) => k !== i));
              onChange(photos.filter((_, k) => k !== i));
            }}
            className="absolute top-1 right-1 flex h-8 w-8 items-center justify-center rounded-full bg-ink/70 text-white"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>
      ))}
      {photos.length < max && (
        <button type="button" onClick={() => setCamera(true)} className="flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-green/50 bg-mint text-sm font-semibold text-green-dark">
          <Icon name="camera" className="h-7 w-7" />
          Add Photo
        </button>
      )}
      {camera && (
        <GeoCamera
          onClose={() => setCamera(false)}
          onUse={(file) => {
            setUrls([...urls, URL.createObjectURL(file)]);
            onChange([...photos, file]);
            setCamera(false);
          }}
        />
      )}
    </div>
  );
}
