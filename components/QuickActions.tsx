"use client";

import { useState } from "react";
import Link from "next/link";
import Icon, { type IconName } from "@/components/Icon";
import GeoCamera from "@/components/GeoCamera";
import { getGpsFix } from "@/lib/sos";

const TILES: { label: string; icon: IconName; href?: string }[] = [
  { label: "Add a Place", icon: "addPlace", href: "/add-place" },
  { label: "Fix Map", icon: "fix", href: "/fix-map" },
  { label: "Post on Map", icon: "post", href: "/post" },
  { label: "View Posted Events", icon: "events", href: "/events" },
  { label: "Maps Camera", icon: "camera" },
  { label: "Get Maps Pin", icon: "getPin", href: "/pin" },
  { label: "Digipin", icon: "digipin", href: "/digipin" },
  { label: "Satellite View", icon: "map" },
];

type Props = { onSatellite: (lat: number, lon: number) => void; onClose: () => void };

// The "+" sheet: everything a traveller can add to or take from the map.
export default function QuickActions({ onSatellite, onClose }: Props) {
  const [camera, setCamera] = useState(false);
  const [note, setNote] = useState("");

  async function satellite() {
    setNote("Finding your location…");
    try {
      const f = await getGpsFix();
      setNote("");
      onSatellite(f.lat, f.lon);
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Could not get your location");
    }
  }

  // Maps Camera: a geotagged photo for the traveller to keep or send (share sheet, or a download).
  async function keep(file: File) {
    setCamera(false);
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: "Himrakshak Geo Cam" }).catch(() => {});
      return;
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(file);
    a.download = file.name;
    a.click();
    setNote("Photo saved");
  }

  return (
    <section className="animate-sheet absolute inset-x-0 bottom-0 z-20 flex max-h-[70dvh] flex-col rounded-t-3xl bg-white/95 pb-28 shadow-[0_-8px_24px_rgba(20,35,31,0.18)] backdrop-blur" aria-label="Quick actions">
      <button onClick={onClose} aria-label="Close" className="flex min-h-10 shrink-0 items-center justify-center">
        <span className="h-1.5 w-12 rounded-full bg-ink/25" />
      </button>
      <ul className="grid grid-cols-4 gap-x-2 gap-y-5 overflow-y-auto px-4 pb-2">
        {TILES.map((t) => {
          const inner = (
            <>
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-ink/10 bg-white text-green shadow-sm">
                <Icon name={t.icon} className="h-8 w-8" />
              </span>
              {t.label}
            </>
          );
          const cls = "flex w-full flex-col items-center gap-1.5 text-center text-xs leading-tight font-medium active:scale-95";
          return (
            <li key={t.label}>
              {t.href ? (
                <Link href={t.href} className={cls}>
                  {inner}
                </Link>
              ) : (
                <button onClick={() => (t.icon === "camera" ? setCamera(true) : satellite())} className={cls}>
                  {inner}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {note && <p className="px-4 text-center text-sm text-muted">{note}</p>}
      {camera && <GeoCamera onUse={keep} onClose={() => setCamera(false)} />}
    </section>
  );
}
