"use client";

import { useEffect, useState } from "react";
import Screen, { Card, PRIMARY } from "@/components/Screen";
import Icon from "@/components/Icon";
import PinPicker, { type Spot } from "@/components/PinPicker";
import { digipin } from "@/lib/digipin";
import { googlePlaceUrl } from "@/lib/google-maps";
import type { PlaceName } from "@/lib/geocode";

// Get Map Pin (exact coordinates) and Get DigiPin (India Post's 10-character address code) share this screen.
export default function PinScreen({ mode }: { mode: "pin" | "digipin" }) {
  const [spot, setSpot] = useState<Spot | null>(null);
  const [place, setPlace] = useState<PlaceName | null>(null);
  const [shown, setShown] = useState(false);
  const [note, setNote] = useState("");

  const cell = spot ? `${spot.lat.toFixed(3)},${spot.lon.toFixed(3)}` : null;
  useEffect(() => {
    if (!cell) return;
    const [lat, lon] = cell.split(",");
    fetch(`/api/places?lat=${lat}&lon=${lon}`)
      .then((r) => (r.ok ? r.json() : { place: null }))
      .then((b: { place: PlaceName | null }) => setPlace(b.place))
      .catch(() => {});
  }, [cell]);

  const code = spot ? digipin(spot.lat, spot.lon) : null;
  const coords = spot ? `${spot.lat.toFixed(4)}° N, ${spot.lon.toFixed(4)}° E` : "Move the map";
  const text = mode === "pin" ? `${place?.title ?? "Location"}: ${coords} ${spot ? googlePlaceUrl(spot.lat, spot.lon) : ""}` : `DigiPin ${code} · ${place?.title ?? ""}`;

  async function share() {
    if (navigator.share) await navigator.share({ text }).catch(() => {});
    else {
      await navigator.clipboard.writeText(text);
      setNote("Copied");
    }
  }

  return (
    <Screen
      icon="pin"
      title={mode === "pin" ? "Get Map Pin" : "Get DigiPin"}
      subtitle={mode === "pin" ? "Find and pick the exact location on the map." : "Find the exact DigiPin for any location on the map."}
      footer={
        mode === "pin" || shown ? (
          <button onClick={share} disabled={!spot} className={PRIMARY}>
            <Icon name={mode === "pin" ? "check" : "share"} />
            {mode === "pin" ? "Confirm Location" : "Share DigiPin"}
          </button>
        ) : (
          <button onClick={() => setShown(true)} disabled={!spot} className={PRIMARY}>
            <Icon name="digipin" />
            Get DigiPin
          </button>
        )
      }
    >
      <PinPicker onChange={setSpot} height="h-80" />
      {mode === "digipin" && shown && (
        <p className="rounded-3xl bg-mint p-4 text-center">
          <span className="block text-sm text-muted">DigiPin</span>
          <span className="font-display text-3xl font-bold tracking-wider text-green-dark">{code ?? "Outside India"}</span>
        </p>
      )}
      <Card title="Selected Location">
        <p className="font-semibold">{place?.title ?? "Finding the place name…"}</p>
        <p className="text-sm text-muted">{coords}</p>
      </Card>
      {note && <p className="text-center text-sm font-semibold text-green">{note}</p>}
    </Screen>
  );
}
