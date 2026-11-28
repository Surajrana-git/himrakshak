import Screen, { MenuRow } from "@/components/Screen";

export default function SettingsPage() {
  return (
    <Screen icon="settings" title="Settings" subtitle="Manage your app preferences and account.">
      <MenuRow icon="user" title="Account" subtitle="Profile, verification, and details" href="/settings/account" />
      <MenuRow icon="bell" title="Notifications" subtitle="Alerts and updates" href="/settings/notifications" />
      <MenuRow icon="map" title="Map Preferences" subtitle="Map type, download, and storage" href="/settings/map" />
      <MenuRow icon="lock" title="Privacy & Security" subtitle="Location, data, and permissions" href="/settings/privacy" />
      <MenuRow icon="language" title="Language" subtitle="English" href="/settings/language" />
    </Screen>
  );
}
