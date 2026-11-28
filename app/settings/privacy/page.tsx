"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Screen, { Card, SECONDARY } from "@/components/Screen";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type Perm = "granted" | "denied" | "prompt" | "unknown";
const WORDS: Record<Perm, string> = { granted: "Allowed", denied: "Blocked (change in phone settings)", prompt: "Will ask when needed", unknown: "Not known on this phone" };

export default function PrivacyPage() {
  const { user } = useAuth();
  const [perms, setPerms] = useState<{ location: Perm; camera: Perm }>({ location: "unknown", camera: "unknown" });
  const [sure, setSure] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    const ask = (name: string) =>
      navigator.permissions
        ?.query({ name: name as PermissionName })
        .then((r) => r.state as Perm)
        .catch(() => "unknown" as Perm) ?? Promise.resolve("unknown" as Perm);
    Promise.all([ask("geolocation"), ask("camera")]).then(([location, camera]) => setPerms({ location, camera }));
  }, []);

  async function deleteMine() {
    if (!supabase || !user) return;
    const [a, b] = await Promise.all([supabase.from("saved_places").delete().eq("user_id", user.id), supabase.from("saved_routes").delete().eq("user_id", user.id)]);
    setNote(a.error || b.error ? "Could not delete everything. Try again." : "Your saved places and routes are deleted.");
    setSure(false);
  }

  return (
    <Screen icon="lock" title="Privacy & Security" subtitle="Location, data, and permissions">
      <Card title="Permissions">
        <p>
          Location: <b>{WORDS[perms.location]}</b>
        </p>
        <p>
          Camera: <b>{WORDS[perms.camera]}</b>
        </p>
      </Card>
      <Card title="Your data">
        <ul className="list-disc pl-5 text-sm">
          <li>Location is used on the phone for risk, routes and SOS. It is sent only with a report, a post or an SOS.</li>
          <li>Reports and posts carry a random phone id, not your name.</li>
          <li>Saved places and routes are private to your account.</li>
        </ul>
        {user &&
          (sure ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button onClick={() => setSure(false)} className={SECONDARY}>
                Cancel
              </button>
              <button onClick={deleteMine} className="min-h-12 rounded-full bg-danger font-semibold text-white">
                Yes, delete
              </button>
            </div>
          ) : (
            <button onClick={() => setSure(true)} className="mt-3 min-h-12 w-full rounded-full border-2 border-danger font-semibold text-danger">
              Delete my saved places and routes
            </button>
          ))}
        {sure && <p className="mt-2 text-sm text-danger">This cannot be undone.</p>}
        {note && <p className="mt-2 text-center font-semibold">{note}</p>}
      </Card>
      <Link href="/terms" className={SECONDARY}>
        Terms and Privacy Policy
      </Link>
    </Screen>
  );
}
