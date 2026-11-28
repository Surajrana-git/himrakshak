"use client";

import { useState, useSyncExternalStore } from "react";
import Screen, { Card } from "@/components/Screen";
import Toggle from "@/components/Toggle";
import { setSetting, useSettings } from "@/lib/settings";

const noop = () => () => {};

export default function NotificationsPage() {
  const s = useSettings();
  const permission = useSyncExternalStore(noop, () => ("Notification" in window ? Notification.permission : "unsupported"), () => "default");
  const [asked, setAsked] = useState<NotificationPermission | null>(null);
  const state = asked ?? permission;

  return (
    <Screen icon="bell" title="Notifications" subtitle="Alerts and updates">
      <Card title="Phone notifications">
        {state === "granted" && <p className="font-semibold text-green-dark">On: Himrakshak can alert you outside the app screen.</p>}
        {state === "denied" && <p className="font-semibold text-danger">Blocked. Turn them on in your phone settings → Apps → Himrakshak → Notifications.</p>}
        {state === "unsupported" && <p>This app view cannot show phone notifications yet. Alerts appear inside the app, with voice and vibration.</p>}
        {state === "default" && (
          <button onClick={() => Notification.requestPermission().then(setAsked)} className="min-h-12 w-full rounded-full bg-green font-semibold text-white">
            Turn on notifications
          </button>
        )}
      </Card>
      <Toggle label="High landslide risk today" hint="A notification once a day when a stretch is at high risk." on={s.riskAlerts} onChange={(v) => setSetting("riskAlerts", v)} />
      <Toggle label="Voice alerts while driving" hint="Turns, closed roads and landslides ahead, spoken aloud." on={s.voice} onChange={(v) => setSetting("voice", v)} />
      <Toggle label="Vibration" hint="A short buzz on every tap, and a strong one when a closure or jam is ahead." on={s.vibrate} onChange={(v) => setSetting("vibrate", v)} />
    </Screen>
  );
}
