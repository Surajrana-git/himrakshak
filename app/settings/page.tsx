"use client";

import Link from "next/link";
import Screen, { MenuRow } from "@/components/Screen";
import Icon from "@/components/Icon";
import HillsArt from "@/components/HillsArt";
import { useAuth } from "@/lib/auth";
import { useSettings } from "@/lib/settings";

const onOff = (v: boolean) => (v ? "on" : "off");

export default function SettingsPage() {
  const { user } = useAuth();
  const s = useSettings();
  const name = (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? null;
  const verified = Boolean(user?.email_confirmed_at || user?.phone_confirmed_at);

  return (
    <Screen icon="settings" title="Settings" subtitle="Manage your app preferences and account.">
      <Link href={user ? "/settings/account" : "/login"} className="flex items-center gap-3 rounded-3xl bg-mint p-4">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-green">
          <Icon name="user" className="h-7 w-7" />
        </span>
        <span className="min-w-0 flex-1">
          <b className="block truncate font-display text-lg">{name ?? "Guest"}</b>
          {user ? (
            <span className={`inline-block rounded-full px-2 text-xs font-bold ${verified ? "bg-green text-white" : "bg-orange/30"}`}>{verified ? "VERIFIED" : "NOT VERIFIED"}</span>
          ) : (
            <span className="text-sm text-muted">Sign in to save places, routes and rewards</span>
          )}
        </span>
        <Icon name="chevron" className="h-5 w-5 text-muted" />
      </Link>

      <p className="px-1 text-sm font-semibold text-muted">Preferences</p>
      <MenuRow icon="bell" title="Notifications" subtitle={`Siren ${onOff(s.siren)} · Voice ${onOff(s.voice)} · Vibrate ${onOff(s.vibrate)}`} href="/settings/notifications" />
      <MenuRow icon="map" title="Map Preferences" subtitle={`Map: ${s.mapType} · Screen on while driving ${onOff(s.keepScreenOn)}`} href="/settings/map" />
      <MenuRow icon="language" title="Language" subtitle="English" href="/settings/language" />

      <p className="px-1 text-sm font-semibold text-muted">Account & safety</p>
      <MenuRow icon="user" title="Account" subtitle="Profile, verification, and details" href="/settings/account" />
      <MenuRow icon="lock" title="Privacy & Security" subtitle="Location, data, and permissions" href="/settings/privacy" />
      <MenuRow icon="help" title="Help & Support" subtitle="FAQs, contact, feedback" href="/help" />

      <HillsArt />
      <p className="text-center text-xs text-muted">Himrakshak 1.0 · Made by Elite Zero Division · Algonex 1.0</p>
    </Screen>
  );
}
