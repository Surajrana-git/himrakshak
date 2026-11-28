"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { listenForLoginCallback, registerForPush } from "@/lib/native";
import { hasNativeSos, sosNative } from "@/lib/sos-native";

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
  useEffect(() => {
    if (ready) registerForPush(user?.id ?? null).catch(() => {});
  }, [ready, user?.id]);
  return null;
}
