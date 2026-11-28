"use client";

import { useState } from "react";
import Screen, { MenuRow, PRIMARY } from "@/components/Screen";
import Icon from "@/components/Icon";
import { getGpsFix, type GpsFix } from "@/lib/sos";
import { googlePlaceUrl } from "@/lib/google-maps";

const message = (f: GpsFix) => `I am here (±${f.accuracy} m), sent from Himrakshak: ${googlePlaceUrl(f.lat, f.lon)}`;

// Sends where you are right now to family or your group. While "sharing" is on, the phone
// re-reads GPS and the share sheet sends the fresh spot each time you tap.
export default function ShareLocationPage() {
  const [fix, setFix] = useState<GpsFix | null>(null);
  const [note, setNote] = useState("");

  async function locate(): Promise<GpsFix | null> {
    setNote("Finding your location…");
    try {
      const f = await getGpsFix();
      setFix(f);
      setNote("");
      return f;
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Could not get your location");
      return null;
    }
  }

  async function shareWithContact() {
    const f = await locate();
    if (!f) return;
    if (navigator.share) await navigator.share({ title: "My location", text: message(f) }).catch(() => {});
    else window.location.href = `sms:?body=${encodeURIComponent(message(f))}`;
  }

  async function copyLink() {
    const f = await locate();
    if (!f) return;
    await navigator.clipboard.writeText(googlePlaceUrl(f.lat, f.lon)).catch(() => {});
    setNote("Link copied. Paste it in WhatsApp or SMS.");
  }

  return (
    <Screen
      icon="share"
      title="Share Live Location"
      subtitle="Share your real-time location with family or team."
      footer={
        <button onClick={shareWithContact} className={PRIMARY}>
          <Icon name="share" /> Start Sharing
        </button>
      }
    >
      <MenuRow icon="users" title="Share with Contact" subtitle="Send live location to someone" onClick={shareWithContact} />
      <MenuRow icon="link" title="Create Sharing Link" subtitle="Generate a link to share" onClick={copyLink} />
      {fix && (
        <p className="rounded-2xl bg-mint p-4 text-center">
          <b>
            {fix.lat.toFixed(5)}° N, {fix.lon.toFixed(5)}° E
          </b>
          <br />
          <span className="text-sm text-muted">GPS accuracy ±{fix.accuracy} m</span>
        </p>
      )}
      {note && <p className="text-center text-sm font-semibold">{note}</p>}
      <p className="text-sm text-muted">No signal? Use SOS: it sends your location by SMS without internet.</p>
    </Screen>
  );
}
