"use client";

import { useState, useSyncExternalStore } from "react";

// Asked once per device. Our card explains why; the phone's own dialog that follows is what actually grants it.
const KEY = "himrakshak-permissions-asked";
const listeners = new Set<() => void>();

function asked(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return true;
  }
}

function finish() {
  try {
    localStorage.setItem(KEY, "1");
  } catch {}
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export default function PermissionPrompt() {
  const pending = useSyncExternalStore(subscribe, () => !asked(), () => false);
  const [step, setStep] = useState<"location" | "notify">("location");
  const [precise, setPrecise] = useState(true);
  if (!pending) return null;

  function next() {
    if ("Notification" in window && Notification.permission === "default") setStep("notify");
    else finish();
  }

  function askLocation() {
    navigator.geolocation?.getCurrentPosition(
      () => {},
      () => {},
      { enableHighAccuracy: precise, timeout: 15000 },
    );
    next();
  }

  return (
    <div className="animate-fade fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-6" role="dialog" aria-modal>
      <div className="w-full max-w-sm rounded-3xl bg-white p-5 text-center shadow-2xl">
        {step === "location" ? (
          <>
            <svg viewBox="0 0 24 24" className="mx-auto h-8 w-8 text-green" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
            <h2 className="mt-2 font-display text-lg font-semibold">
              Allow <span className="text-green">Himrakshak</span> to access this device&apos;s location?
            </h2>
            <p className="mt-1 text-sm text-muted">Map, safe route aur SOS ke liye. Location sirf report ya SOS bhejne par server tak jaati hai.</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {([true, false] as const).map((p) => (
                <button
                  key={String(p)}
                  onClick={() => setPrecise(p)}
                  aria-pressed={precise === p}
                  className={`flex flex-col gap-2 rounded-2xl border-2 p-2 text-left text-sm font-semibold ${precise === p ? "border-green bg-mint" : "border-ink/10"}`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className={`h-4 w-4 rounded-full border-2 ${precise === p ? "border-green bg-green" : "border-muted"}`} />
                    {p ? "Precise" : "Approximate"}
                  </span>
                  <svg viewBox="0 0 80 56" className="h-16 w-full rounded-xl bg-ink" aria-hidden>
                    <path d="M0 20h80M0 40h80M25 0v56M55 0v56M0 56 80 0" stroke="#5b6662" strokeWidth="2" />
                    {p ? (
                      <path d="M40 14a8 8 0 0 0-8 8c0 6 8 14 8 14s8-8 8-14a8 8 0 0 0-8-8z" fill="#0e7a3d" stroke="#fff" strokeWidth="2" />
                    ) : (
                      <circle cx="40" cy="28" r="20" fill="#0e7a3d" fillOpacity="0.5" />
                    )}
                  </svg>
                </button>
              ))}
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <button onClick={askLocation} className="min-h-12 rounded-full bg-green font-semibold text-white">
                While using the app
              </button>
              <button onClick={askLocation} className="min-h-12 rounded-full border-2 border-green font-semibold text-green">
                Only this time
              </button>
              <button onClick={next} className="min-h-12 rounded-full border-2 border-green font-semibold text-green">
                Don&apos;t allow
              </button>
            </div>
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" className="mx-auto h-10 w-10 text-green" fill="currentColor" aria-hidden>
              <path d="M12 22a2.5 2.5 0 0 0 2.5-2.5h-5A2.5 2.5 0 0 0 12 22zm7-6V11a7 7 0 0 0-5.5-6.8V3.5a1.5 1.5 0 0 0-3 0v.7A7 7 0 0 0 5 11v5l-2 2v1h18v-1z" />
            </svg>
            <h2 className="mt-2 font-display text-lg font-semibold">
              Allow <span className="text-green">Himrakshak</span> to send you notifications?
            </h2>
            <p className="mt-1 text-sm text-muted">Aapke raste par landslide ya rasta band hone ki khabar ke liye.</p>
            <div className="mt-4 flex flex-col gap-2">
              <button onClick={() => Notification.requestPermission().finally(finish)} className="min-h-12 rounded-full bg-green font-semibold text-white">
                Allow
              </button>
              <button onClick={finish} className="min-h-12 rounded-full border-2 border-green font-semibold text-green">
                Don&apos;t allow
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
