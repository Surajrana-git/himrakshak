"use client";

import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { PushNotifications } from "@capacitor/push-notifications";
import { supabase } from "@/lib/supabase";

// In the Android app the site runs inside a WebView, where Google refuses to show its sign-in page.
// So sign-in opens in Chrome (Custom Tab) and comes back on this link; add it in Supabase → URL Configuration.
export const APP_CALLBACK = "in.himrakshak.app://login-callback";

export const isApp = () => Capacitor.isNativePlatform();

export async function socialSignIn(provider: "google" | "apple"): Promise<string | null> {
  if (!supabase) return "Sign-in is not available: the server is not configured";
  if (!isApp()) {
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin } });
    return error?.message ?? null;
  }
  const { data, error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: APP_CALLBACK, skipBrowserRedirect: true } });
  if (error || !data.url) return error?.message ?? "Could not start sign-in";
  await Browser.open({ url: data.url });
  return null;
}

// Called once when the app starts: finish a sign-in that came back from Chrome.
export function listenForLoginCallback(onDone: () => void): () => void {
  if (!isApp() || !supabase) return () => {};
  const client = supabase;
  const handle = App.addListener("appUrlOpen", async ({ url }) => {
    if (!url.startsWith(APP_CALLBACK)) return;
    // Supabase puts the tokens after "#" (implicit flow).
    const params = new URLSearchParams(url.split("#")[1] ?? "");
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    await Browser.close().catch(() => {});
    if (access_token && refresh_token) {
      await client.auth.setSession({ access_token, refresh_token });
      onDone();
    }
  });
  return () => {
    handle.then((h) => h.remove());
  };
}

// Push needs a Firebase project (android/app/google-services.json). Without it the native side
// crashes on register(), so it stays off until NEXT_PUBLIC_PUSH_ENABLED=1 is set.
export async function registerForPush(userId: string | null): Promise<void> {
  if (!isApp() || process.env.NEXT_PUBLIC_PUSH_ENABLED !== "1" || !supabase) return;
  const client = supabase;
  const { receive } = await PushNotifications.requestPermissions();
  if (receive !== "granted") return;
  await PushNotifications.addListener("registration", async ({ value }) => {
    await client.from("push_tokens").upsert({ token: value, user_id: userId }, { onConflict: "token" });
  });
  await PushNotifications.register();
}
