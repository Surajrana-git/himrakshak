"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Screen, { Card, Chips, PRIMARY } from "@/components/Screen";
import Icon, { type IconName } from "@/components/Icon";
import PinPicker, { type Spot } from "@/components/PinPicker";
import PhotoSlots from "@/components/PhotoSlots";
import { addContribution, type ContributionKind } from "@/lib/contributions";

type Config = {
  kind: ContributionKind;
  icon: IconName;
  title: string;
  subtitle: string;
  categoryLabel: string;
  categories: readonly string[];
  nameField?: { label: string; placeholder: string }; // Add a Place only
  maxPhotos: number;
  detailsLabel: string;
  detailsPlaceholder: string;
  detailsRequired: boolean;
  visibility?: boolean; // Post on Map only
  submit: string;
  done: string;
};

// Add a Place, Fix Map, Map Camera (Post on Map) and Report Hazard share this form:
// category chips, exact spot on the map, Geo Cam photos, a short text.
export default function ContributionForm({ config }: { config: Config }) {
  const router = useRouter();
  const [category, setCategory] = useState<string | null>(config.categories[0]);
  const [name, setName] = useState("");
  const [spot, setSpot] = useState<Spot | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [details, setDetails] = useState("");
  const [visibility, setVisibility] = useState<"Public" | "Community">("Public");
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");

  const missing = !category
    ? `Choose ${config.categoryLabel.toLowerCase()}`
    : config.nameField && !name.trim()
      ? "Enter the place name"
      : config.detailsRequired && !details.trim()
        ? `${config.detailsLabel} is required`
        : !spot
          ? "Set the location on the map"
          : null;

  async function submit() {
    if (missing || !spot || !category) return setError(missing ?? "");
    setStatus("sending");
    setError("");
    try {
      await addContribution({
        kind: config.kind,
        category,
        title: config.nameField ? name.trim() : null,
        details: details.trim() || null,
        lat: spot.lat,
        lon: spot.lon,
        photos,
        visibility: visibility === "Public" ? "public" : "community",
      });
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send");
      setStatus("idle");
    }
  }

  if (status === "done") {
    return (
      <Screen icon="check" title="Thank you" subtitle={config.done}>
        <p className="rounded-2xl bg-mint p-4 text-center">
          It is now in <b>View Posted Events</b> for every traveller, and it counts for your Road Rewards.
        </p>
        <button onClick={() => router.push("/events")} className={PRIMARY}>
          View Posted Events
        </button>
        <button onClick={() => router.push("/")} className="min-h-12 font-semibold text-green-dark">
          Back to the map
        </button>
      </Screen>
    );
  }

  return (
    <Screen
      icon={config.icon}
      title={config.title}
      subtitle={config.subtitle}
      footer={
        <>
          {error && <p className="mb-2 text-center text-sm font-semibold text-danger">{error}</p>}
          <button onClick={submit} disabled={status === "sending"} className={PRIMARY}>
            <Icon name="check" />
            {status === "sending" ? "Sending… (AI is checking the photos)" : config.submit}
          </button>
        </>
      }
    >
      <Card title={`${config.categoryLabel} *`}>
        <Chips options={config.categories} value={category} onChange={setCategory} label={config.categoryLabel} />
      </Card>
      {config.nameField && (
        <Card title={`${config.nameField.label} *`}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            placeholder={config.nameField.placeholder}
            className="min-h-12 w-full rounded-full border-2 border-ink/15 px-4"
          />
        </Card>
      )}
      <Card title="Location on Map *" hint="Confirm or adjust the exact spot">
        <PinPicker onChange={setSpot} height="h-56" />
        {spot && (
          <p className="mt-2 text-sm font-semibold">
            {spot.lat.toFixed(5)}° N, {spot.lon.toFixed(5)}° E
          </p>
        )}
      </Card>
      <Card title={`Add Photos (optional)`} hint={`Up to ${config.maxPhotos} photos, taken with the Himrakshak Geo Cam`}>
        <PhotoSlots max={config.maxPhotos} photos={photos} onChange={setPhotos} />
      </Card>
      <Card title={`${config.detailsLabel}${config.detailsRequired ? " *" : " (optional)"}`}>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value.slice(0, 300))}
          rows={3}
          placeholder={config.detailsPlaceholder}
          className="w-full rounded-2xl border-2 border-ink/15 p-3"
        />
        <p className="text-right text-xs text-muted">{details.length} / 300</p>
      </Card>
      {config.visibility && (
        <Card title="Post Visibility" hint="Choose who can see this update">
          <Chips options={["Public", "Community"] as const} value={visibility} onChange={setVisibility} label="Visibility" />
        </Card>
      )}
    </Screen>
  );
}
