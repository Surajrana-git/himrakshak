"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { listenForLoginCallback, registerForPush } from "@/lib/native";
import { hasNativeSos, sosNative } from "@/lib/sos-native";
import { getSettings } from "@/lib/settings";

// Android-app-only glue: finish Google sign-in from Chrome, and sign the phone up for push alerts.
export default function NativeBridge() {
  const router = useRouter();
  const { user, ready } = useAuth();
  useEffect(() => listenForLoginCallback(() => router.replace("/")), [router]);
  // Every Himrakshak phone listens for SOS calls nearby over Bluetooth (low-power scan), so a car
  // stuck without signal is heard by the next car on the road. Asks for Bluetooth once.
  useEffect(() => {
    if (hasNativeSos()) sosNative.startMesh({}).catch(() => {});
  }, []);
  // A short buzz on every tap of a button, link, switch or chip, so a driver feels the press
  // without looking (Settings → Notifications → Vibrate turns it off).
  useEffect(() => {
    const tap = (e: PointerEvent) => {
      const el = e.target instanceof Element ? e.target.closest("button, a, [role=switch], [role=radio], label") : null;
      if (el && !(el as HTMLButtonElement).disabled && getSettings().vibrate) navigator.vibrate?.(12);
    };
    document.addEventListener("pointerdown", tap, { passive: true });
    return () => document.removeEventListener("pointerdown", tap);
  }, []);
  useEffect(() => {
    if (ready) registerForPush(user?.id ?? null).catch(() => {});
  }, [ready, user?.id]);
  return null;
}
