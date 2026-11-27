"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

// Chrome's install event; not in TypeScript's DOM types yet.
type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

// Android/desktop Chrome: one-tap install. iPhone Safari has no install API, so we show the steps.
export default function InstallButton() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const isIos = useSyncExternalStore(noSubscribe, iosNotInstalled, () => false);
  const [showIosSteps, setShowIosSteps] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPromptEvent);
    };
    const onInstalled = () => setPrompt(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    await prompt.userChoice;
    setPrompt(null);
  }

  if (prompt) {
    return (
      <button onClick={install} className="flex min-h-12 w-full shrink-0 items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-left text-snow">
        <DownloadIcon />
        <span>
          <span className="block font-semibold">Install the app</span>
          <span className="block text-sm opacity-80">Open it from your home screen; it also works offline</span>
        </span>
      </button>
    );
  }

  if (isIos) {
    return (
      <div className="shrink-0 rounded-2xl bg-ink text-snow">
        <button onClick={() => setShowIosSteps(!showIosSteps)} aria-expanded={showIosSteps} className="flex min-h-12 w-full items-center gap-3 px-4 py-3 text-left">
          <DownloadIcon />
          <span className="font-semibold">Install on iPhone</span>
        </button>
        {showIosSteps && (
          <ol className="list-decimal px-4 pb-4 pl-9 text-sm">
            <li>In Safari, tap the Share button at the bottom</li>
            <li>Choose &ldquo;Add to Home Screen&rdquo;</li>
            <li>&ldquo;Add&rdquo; dabayein</li>
          </ol>
        )}
      </div>
    );
  }

  return null;
}

// The device never changes while the page is open, so there is nothing to subscribe to.
const noSubscribe = () => () => {};

function iosNotInstalled(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.matchMedia("(display-mode: standalone)").matches;
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
      <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
    </svg>
  );
}
