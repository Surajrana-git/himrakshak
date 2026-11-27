"use client";

import { useEffect } from "react";

const APP_LINK = "in.himrakshak.app://login-callback";

// Google sign-in from the Android app ends here, in Chrome. Chrome may block a redirect straight into
// the app, so this page hands the tokens over itself, and offers a button (a tap is always allowed).
export default function AppReturn() {
  const openApp = () => {
    window.location.href = APP_LINK + window.location.hash;
  };
  useEffect(openApp, []);
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-white p-8 text-center text-ink">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-mark.png" alt="Himrakshak" className="h-24 w-24 object-contain" />
      <h1 className="font-display text-2xl font-bold">Signed in</h1>
      <p className="text-muted">Go back to the app to continue.</p>
      <button onClick={openApp} className="min-h-14 w-full max-w-xs rounded-full bg-green font-display text-xl font-semibold text-white">
        Open Himrakshak
      </button>
    </main>
  );
}
