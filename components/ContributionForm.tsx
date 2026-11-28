"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Screen, { Card, Chips, PRIMARY } from "@/components/Screen";
import Icon, { type IconName } from "@/components/Icon";
import PinPicker, { type Spot } from "@/components/PinPicker";
import PhotoSlots from "@/components/PhotoSlots";
import { addContribution, STATUS_LABEL, type ContributionKind, type Status } from "@/lib/contributions";

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
  cameraFirst?: boolean; // Map Camera and Report Hazard open the Geo Cam straight away
  submit: string;
  done: string;
};

// Add a Place, Fix Map, Map Camera (Post on Map) and Report Hazard share this form:
// category chips, exact spot on the map, Geo Cam photos, a short text.
export default function ContributionForm({ config }: { config: Config }) {
  const router = useRouter();
  const [category, setCategory] = useState<string | null>(config.categories[0]);
  const [name, setName] = useState("");
  const [otherType, setOtherType] = useState(""); // what "Other" means, in the user's words
  const [spot, setSpot] = useState<Spot | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [details, setDetails] = useState("");
  const [visibility, setVisibility] = useState<"Public" | "Community">("Public");
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [result, setResult] = useState<{ status: Status; reason: string | null } | null>(null);
  const [error, setError] = useState("");

  const isOther = category === "Other";
  const missing = !category
    ? `Choose ${config.categoryLabel.toLowerCase()}`
    : isOther && !otherType.trim()
      ? "Write what kind of post this is"
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
      const saved = await addContribution({
        kind: config.kind,
        category: isOther ? otherType.trim() : category,
        title: config.nameField ? name.trim() : null,
        details: details.trim() || null,
        lat: spot.lat,
        lon: spot.lon,
        photos,
        visibility: visibility === "Public" ? "public" : "community",
      });
      setResult(saved);
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send");
      setStatus("idle");
    }
  }

  if (status === "done" && result) {
    return (
      <Screen
        icon={result.status === "rejected" ? "hazard" : "check"}
        title={STATUS_LABEL[result.status]}
        subtitle={result.status === "approved" ? config.done : undefined}
      >
        <p className={`rounded-2xl p-4 text-center ${result.status === "rejected" ? "bg-danger/10" : "bg-mint"}`}>
          {result.status === "approved" && "The AI checked your photo. Your post is on the map with its photo, and it earns Road Rewards points."}
          {result.status === "pending" &&
            "Your post is saved. Without a checked photo it waits until another driver posts the same thing nearby; then it goes on the map."}
          {result.status === "rejected" && `The AI did not accept the photo: ${result.reason ?? "not a live Geo Cam photo"}. It will not show on the map. Take a new photo with the Geo Cam.`}
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

  const photoCard = (
    <Card title="Photos · Himrakshak Geo Cam" hint={`Up to ${config.maxPhotos} photos. Place, GPS and time are printed on each one.`}>
      <PhotoSlots max={config.maxPhotos} photos={photos} onChange={setPhotos} openOnStart={config.cameraFirst} />
    </Card>
  );

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
      {config.cameraFirst && photoCard}
      <Card title={`${config.categoryLabel} *`}>
        <Chips options={config.categories} value={category} onChange={setCategory} label={config.categoryLabel} />
        {isOther && (
          <input
            value={otherType}
            onChange={(e) => setOtherType(e.target.value)}
            maxLength={40}
            autoFocus
            placeholder="Write the type (e.g., Fallen tree, Bridge damage)"
            className="mt-3 min-h-12 w-full rounded-full border-2 border-green px-4"
          />
        )}
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
      {!config.cameraFirst && photoCard}
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
