"use client";

import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { PushNotifications } from "@capacitor/push-notifications";
import { supabase } from "@/lib/supabase";

// In the Android app the site runs inside a WebView, where Google refuses to show its sign-in page.
// So sign-in opens in Chrome (Custom Tab); /auth/app-return then opens the app on this link.
export const APP_CALLBACK = "in.himrakshak.app://login-callback";

export const isApp = () => Capacitor.isNativePlatform();

export async function socialSignIn(): Promise<string | null> {
  const provider = "google";
  if (!supabase) return "Sign-in is not available: the server is not configured";
  if (!isApp()) {
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin } });
    return error?.message ?? null;
  }
  // Back to our own page first (an https/http URL Supabase already allows); it opens the app.
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${window.location.origin}/auth/app-return`, skipBrowserRedirect: true },
  });
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

// Push needs a Firebase project (android/app/google-services.json, kept out of git). Without it the native side
// crashes on register(), so it stays off until NEXT_PUBLIC_PUSH_ENABLED=1 is set.
export async function registerForPush(userId: string | null): Promise<void> {
  if (!isApp() || process.env.NEXT_PUBLIC_PUSH_ENABLED !== "1" || !supabase) return;
  const client = supabase;
  const { receive } = await PushNotifications.requestPermissions();
  if (receive !== "granted") return;
  await PushNotifications.addListener("registration", async ({ value }) => {
    // Insert, then refresh if this phone is already known. (An upsert needs a read policy,
    // and phone tokens are deliberately unreadable to the app.)
    const { error } = await client.from("push_tokens").insert({ token: value, user_id: userId });
    if (error?.code === "23505") await client.from("push_tokens").update({ user_id: userId, updated_at: new Date().toISOString() }).eq("token", value);
  });
  await PushNotifications.register();
}
