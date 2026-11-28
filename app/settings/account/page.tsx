"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Screen, { Card, PRIMARY, SECONDARY } from "@/components/Screen";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

const INPUT = "min-h-12 w-full rounded-full border-2 border-ink/15 px-4";

export default function AccountPage() {
  const router = useRouter();
  const { user, ready } = useAuth();
  const [name, setName] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [note, setNote] = useState("");

  if (ready && !user) {
    return (
      <Screen icon="user" title="Account" subtitle="Profile, verification, and details">
        <p className="rounded-2xl bg-mint p-4 text-center">You are using Himrakshak as a guest.</p>
        <Link href="/login" className={PRIMARY}>
          Sign In / Create Account
        </Link>
      </Screen>
    );
  }

  const shownName = name ?? (user?.user_metadata?.full_name as string | undefined) ?? "";
  const verified = Boolean(user?.email_confirmed_at || user?.phone_confirmed_at);

  async function saveName() {
    if (!supabase || !shownName.trim()) return;
    const { error } = await supabase.auth.updateUser({ data: { full_name: shownName.trim() } });
    setNote(error ? `Could not save: ${error.message}` : "Name saved");
  }

  async function changePassword() {
    if (!supabase) return;
    if (password.length < 8) return setNote("Use at least 8 characters");
    const { error } = await supabase.auth.updateUser({ password });
    setNote(error ? `Could not change: ${error.message}` : "Password changed");
    if (!error) setPassword("");
  }

  async function logOut() {
    await supabase?.auth.signOut();
    router.push("/login");
  }

  return (
    <Screen icon="user" title="Account" subtitle="Profile, verification, and details">
      <Card title="Profile">
        <label className="text-sm font-semibold">
          Full Name
          <input value={shownName} onChange={(e) => setName(e.target.value)} maxLength={60} className={`${INPUT} mt-1 font-normal`} />
        </label>
        <button onClick={saveName} className={`${SECONDARY} mt-3`}>
          Save name
        </button>
      </Card>
      <Card title="Verification">
        <p>{user?.email ?? user?.phone}</p>
        <p className={`mt-1 font-semibold ${verified ? "text-green-dark" : "text-danger"}`}>
          {verified ? "Verified" : "Not verified yet: open the link we sent to your email."}
        </p>
        <p className="mt-1 text-sm text-muted">Signed in with {String(user?.app_metadata?.provider ?? "email")}.</p>
      </Card>
      <Card title="Password" hint="Signed in with Google? Your Google password stays with Google.">
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password (8+ characters)" className={INPUT} />
        <button onClick={changePassword} className={`${SECONDARY} mt-3`}>
          Change password
        </button>
      </Card>
      {note && <p className="text-center font-semibold">{note}</p>}
      <button onClick={logOut} className="min-h-12 rounded-full border-2 border-danger font-semibold text-danger">
        Log out
      </button>
    </Screen>
  );
}
