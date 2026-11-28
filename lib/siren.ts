"use client";

import { getSettings } from "@/lib/settings";

// Himrakshak danger siren (three beeps + a rising sweep, ~2 s, made for this app: public/siren.wav).
// For landslide, rockfall, blocked road, flooding, SOS nearby and high risk ahead; never for a jam.
let audio: HTMLAudioElement | null = null;

export function playSiren() {
  if (typeof window === "undefined" || !getSettings().siren) return;
  audio ??= new Audio("/siren.wav");
  audio.currentTime = 0;
  audio.volume = 1;
  audio.play().catch(() => {}); // a browser may block sound before the first tap; the pop-up still shows
}
