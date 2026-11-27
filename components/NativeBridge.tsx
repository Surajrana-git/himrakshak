"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { listenForLoginCallback, registerForPush } from "@/lib/native";

// Android-app-only glue: finish Google sign-in from Chrome, and sign the phone up for push alerts.
export default function NativeBridge() {
  const router = useRouter();
  const { user, ready } = useAuth();
  useEffect(() => listenForLoginCallback(() => router.replace("/")), [router]);
  useEffect(() => {
    if (ready) registerForPush(user?.id ?? null).catch(() => {});
  }, [ready, user?.id]);
  return null;
}
