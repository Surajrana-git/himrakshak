"use client";

import Link from "next/link";
import { useState } from "react";
import Screen from "@/components/Screen";
import Icon, { type IconName } from "@/components/Icon";
import { useAuth } from "@/lib/auth";

function Group({ icon, title, subtitle, children, id }: { icon: IconName; title: string; subtitle: string; children: React.ReactNode; id?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <section id={id} className="rounded-2xl border border-ink/10 shadow-sm">
      <button onClick={() => setOpen(!open)} className="flex min-h-16 w-full items-center gap-3 p-3 text-left">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-mint text-green">
          <Icon name={icon} />
        </span>
        <span className="flex-1">
          <b className="font-display">{title}</b>
          <span className="block text-sm text-muted">{subtitle}</span>
        </span>
        <Icon name="chevron" className={`h-5 w-5 text-muted ${open ? "rotate-90" : ""}`} />
      </button>
      {open && <div className="border-t border-ink/10 p-4 text-sm">{children}</div>}
    </section>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [notify, setNotify] = useState(() => (typeof Notification === "undefined" ? "unsupported" : Notification.permission));

  return (
    <Screen icon="settings" title="Settings" subtitle="Manage your app preferences and account.">
      <Group icon="user" title="Account" subtitle="Profile, verification, and details">
        {user ? (
          <>
            <p>
              <b>{(user.user_metadata?.full_name as string | undefined) ?? "No name set"}</b>
            </p>
            <p className="text-muted">{user.email ?? user.phone}</p>
            <p className="mt-1">{user.email_confirmed_at || user.phone_confirmed_at ? "Verified" : "Not verified yet: open the link we emailed you."}</p>
          </>
        ) : (
          <Link href="/login" className="font-semibold text-green underline">
            Sign in to see your account
          </Link>
        )}
      </Group>
      <Group icon="bell" title="Notifications" subtitle="Alerts and updates">
        <p>Alerts for landslides and closures on your route: {notify === "granted" ? "on" : notify === "denied" ? "blocked in phone settings" : "off"}.</p>
        {notify === "default" && (
          <button onClick={() => Notification.requestPermission().then(setNotify)} className="mt-2 min-h-11 rounded-full bg-green px-4 font-semibold text-white">
            Turn on alerts
          </button>
        )}
      </Group>
      <Group icon="map" title="Map Preferences" subtitle="Map type, download, and storage">
        <p>Change the map type (street, satellite, terrain) with the layers button on the map.</p>
        <Link href="/offline-maps" className="mt-2 inline-block font-semibold text-green underline">
          Download maps for offline use
        </Link>
      </Group>
      <Group icon="lock" title="Privacy & Security" subtitle="Location, data, and permissions">
        <p>Your location is used on the phone for risk, navigation and SOS. It is sent only when you send a report or an SOS. Reports carry a random phone id, not your name.</p>
        <Link href="/terms" className="mt-2 inline-block font-semibold text-green underline">
          Terms and Privacy Policy
        </Link>
      </Group>
      <Group id="language" icon="language" title="Language" subtitle="English">
        <p>The app is in plain English, short words a driver reads at a glance. Hindi is coming next.</p>
      </Group>
    </Screen>
  );
}
