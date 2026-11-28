"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

// Bump when the terms or privacy text changes; it is stored with each new account as consent proof.
export const TERMS_VERSION = "2026-11-27-draft";
const GUEST_KEY = "himrakshak-guest";

export type AuthState = { user: User | null; ready: boolean };

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ user: null, ready: !supabase });
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setState({ user: data.session?.user ?? null, ready: true }));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setState({ user: session?.user ?? null, ready: true }));
    return () => data.subscription.unsubscribe();
  }, []);
  return state;
}

// Guest lasts one app session: the next cold start asks to sign in again.
export function isGuest(): boolean {
  try {
    return sessionStorage.getItem(GUEST_KEY) === "1";
  } catch {
    return false;
  }
}

export function continueAsGuest() {
  try {
    sessionStorage.setItem(GUEST_KEY, "1");
  } catch {}
}

// Whether mobile-number (OTP) login is switched on in the Supabase dashboard (public endpoint).
export async function enabledProviders(): Promise<{ phone: boolean }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return { phone: false };
  const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } });
  if (!res.ok) return { phone: false };
  const { external } = await res.json();
  return { phone: Boolean(external?.phone) };
}
