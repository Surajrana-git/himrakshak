"use client";

import { useSyncExternalStore } from "react";

// Shown once per app session (not on every reload), so drivers are not slowed down twice.
const KEY = "himrakshak-splash-seen";
const listeners = new Set<() => void>();

function seen(): boolean {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return true;
  }
}

function dismiss() {
  try {
    sessionStorage.setItem(KEY, "1");
  } catch {}
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Team logo animation while the live map loads underneath; tap anywhere to skip.
export default function Splash() {
  // The server renders it, so it is on screen from the very first paint.
  const visible = useSyncExternalStore(subscribe, () => !seen(), () => true);
  if (!visible) return null;
  return (
    <div onClick={dismiss} className="fixed inset-0 z-50 flex items-center justify-center bg-white">
      <video
        src="/splash.mp4"
        poster="/splash-poster.jpg"
        autoPlay
        muted
        playsInline
        onEnded={dismiss}
        onError={dismiss}
        className="h-full w-full max-w-md object-contain"
        aria-label="Himrakshak"
      />
      <button
        onClick={dismiss}
        className="absolute right-4 bottom-6 min-h-12 rounded-full border-2 border-ink px-5 font-semibold text-ink"
      >
        Aage badhein / Skip
      </button>
    </div>
  );
}
