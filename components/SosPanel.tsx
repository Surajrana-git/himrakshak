"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { getGpsFix, sosText, type GpsFix } from "@/lib/sos";
import { MESH_TTL, newPacketId, REASON_HAZARD, toText, type SosPacket } from "@/lib/sos-packet";
import { hasNativeSos, sosNative, type MeshStatus } from "@/lib/sos-native";

const noop = () => () => {};

// Rescue gateway number that turns an SMS into a pin on the dashboard (/api/sos-sms webhook).
const GATEWAY = process.env.NEXT_PUBLIC_SOS_SMS_GATEWAY ?? "";

const REASONS = ["Vehicle stuck", "Injured", "Trapped by a road block", "Saw a landslide"];
const CONTACT_KEY = "himrakshak-sos-contact";

type Step =
  | { kind: "idle" }
  | { kind: "locating" }
  | { kind: "sent"; fix: GpsFix }
  | { kind: "offline"; fix: GpsFix; reason: string; packet: SosPacket }
  | { kind: "no-gps"; reason: string };

// The contact number lives in this phone only (localStorage), read through a tiny store so
// the server render ("") and the phone's saved value don't clash during hydration.
let contactValue: string | null = null;
const contactListeners = new Set<() => void>();

function readContact(): string {
  if (contactValue === null) {
    try {
      contactValue = localStorage.getItem(CONTACT_KEY) ?? "";
    } catch {
      contactValue = "";
    }
  }
  return contactValue;
}

function writeContact(value: string) {
  contactValue = value;
  try {
    localStorage.setItem(CONTACT_KEY, value);
  } catch {
    // Private mode: the number just isn't remembered after closing.
  }
  contactListeners.forEach((listener) => listener());
}

function subscribeContact(listener: () => void) {
  contactListeners.add(listener);
  return () => {
    contactListeners.delete(listener);
  };
}

// Survive: one big button. Online → saved for the rescue dashboard. No data → SMS with the location.
export default function SosPanel() {
  const [step, setStep] = useState<Step>({ kind: "idle" });
  const [reason, setReason] = useState<string | null>(null);
  const contact = useSyncExternalStore(subscribeContact, readContact, () => "");
  // Android app with the offline SOS plugin (false on the server render and on the website).
  const native = useSyncExternalStore(noop, hasNativeSos, () => false);
  const [sms, setSms] = useState<Record<string, string>>({}); // number → what happened
  const [mesh, setMesh] = useState<MeshStatus | null>(null);
  const [meshNote, setMeshNote] = useState("");

  // Live counts from the Bluetooth relay, and SMS delivery reports.
  useEffect(() => {
    if (!hasNativeSos()) return;
    sosNative.meshStatus().then(setMesh).catch(() => {});
    const handles = [
      sosNative.addListener("mesh", (e) => {
        setMesh(e);
        if (e.event === "bluetooth-off") setMeshNote("Turn on Bluetooth so phones nearby can pass your SOS on.");
        if (e.event === "synced") setMeshNote("A phone with internet carried an SOS to the rescue dashboard.");
      }),
      sosNative.addListener("sms", (e) => setSms((cur) => ({ ...cur, [e.number]: `${e.status}${e.status === "failed" || e.status === "retrying" ? `: ${e.detail}` : ""}` }))),
    ];
    return () => handles.forEach((h) => h.then((x) => x.remove()));
  }, []);

  // The waterfall: internet → SMS (no data needed) → Bluetooth mesh (no signal needed).
  async function pressSos() {
    setStep({ kind: "locating" });
    let fix: GpsFix;
    try {
      fix = await getGpsFix();
    } catch (e) {
      setStep({ kind: "no-gps", reason: (e as Error).message });
      return;
    }
    const packet: SosPacket = { id: newPacketId(), lat: fix.lat, lon: fix.lon, hazard: (reason && REASON_HAZARD[reason]) || "OTHER", ts: Math.floor(Date.now() / 1000), ttl: MESH_TTL };
    const online = await fetch("/api/sos-relay", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ packet: toText(packet), via: "app" }) })
      .then((r) => r.ok)
      .catch(() => false);
    if (online) return setStep({ kind: "sent", fix });

    setStep({ kind: "offline", fix, reason: "No internet", packet });
    if (!native) return; // website: the SMS button below opens the SMS app
    // Android app: the SMS goes out by itself, and the Bluetooth mesh starts carrying the SOS.
    const family = contact.replace(/[^\d+]/g, "");
    const sends = [
      family && sosNative.sendSms({ number: family, text: `${sosText(fix, reason)}\n${toText(packet)}` }),
      GATEWAY && sosNative.sendSms({ number: GATEWAY, text: toText(packet) }),
    ].filter(Boolean) as Promise<unknown>[];
    await Promise.allSettled(sends);
    sosNative.startMesh({ packet: toText(packet) }).then(setMesh).catch((e: Error) => setMeshNote(e.message));
  }

  async function toggleRelay() {
    try {
      setMesh(mesh?.running ? await sosNative.stopMesh() : await sosNative.startMesh({}));
      setMeshNote("");
    } catch (e) {
      setMeshNote(e instanceof Error ? e.message : "Bluetooth relay could not start");
    }
  }

  const fix = step.kind === "sent" || step.kind === "offline" ? step.fix : null;
  const smsHref = fix ? `sms:${contact.replace(/[^\d+]/g, "")}?body=${encodeURIComponent(sosText(fix, reason))}` : null;

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-4 pt-[max(16px,env(safe-area-inset-top))] pb-[max(24px,env(safe-area-inset-bottom))]">
      <header className="flex items-center gap-3">
        <Link href="/" aria-label="Back to map" className="flex h-12 w-12 items-center justify-center rounded-full bg-ink/10">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </Link>
        <div>
          <h1 className="font-display text-3xl leading-tight">SOS</h1>
          <p className="text-sm text-muted">Works without internet: SMS, then Bluetooth phone to phone</p>
        </div>
      </header>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-semibold">What happened? (optional)</legend>
        {REASONS.map((r) => (
          <label key={r} className={`flex min-h-12 cursor-pointer items-center rounded-xl border-2 px-3 ${reason === r ? "border-danger bg-danger/10" : "border-ink/20"}`}>
            <input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} className="sr-only" />
            {r}
          </label>
        ))}
      </fieldset>

      <button
        onClick={pressSos}
        disabled={step.kind === "locating"}
        className="mx-auto flex h-44 w-44 flex-col items-center justify-center rounded-full border-8 border-danger/30 bg-danger text-snow shadow-2xl disabled:opacity-70"
      >
        <span className="font-display text-6xl leading-none">SOS</span>
        <span className="mt-1 text-sm font-semibold">{step.kind === "locating" ? "Getting location…" : "Press"}</span>
      </button>

      {step.kind === "sent" && (
        <section className="rounded-2xl bg-teal p-4 text-ink">
          <p className="font-display text-2xl">SOS bhej diya</p>
          <p>Your location is on the rescue dashboard. Stay where you are and keep your phone on.</p>
          <p className="mt-1 text-sm">
            {step.fix.lat.toFixed(5)}, {step.fix.lon.toFixed(5)} (±{step.fix.accuracy} m)
          </p>
        </section>
      )}
      {step.kind === "offline" && (
        <section className="rounded-2xl bg-danger p-4 text-snow">
          <p className="font-display text-2xl">No internet: sending another way</p>
          {native ? (
            <ul className="mt-1 flex flex-col gap-1 text-sm">
              {!contact && !GATEWAY && <li>SMS: add a family number below to send your location by SMS.</li>}
              {Object.entries(sms).map(([n, st]) => (
                <li key={n}>
                  SMS to {n}: <b>{st}</b>
                </li>
              ))}
              <li>
                Bluetooth: {mesh?.sending ? "your SOS is being passed phone to phone" : "starting…"}
                {mesh ? ` · ${mesh.heard} heard, ${mesh.synced} reached rescue` : ""}
              </li>
              <li className="font-mono text-xs opacity-80">{toText(step.packet)}</li>
            </ul>
          ) : (
            <p className="text-sm">Tap the SMS button below: the message with your location is ready.</p>
          )}
        </section>
      )}
      {step.kind === "no-gps" && (
        <section className="rounded-2xl bg-danger p-4 text-snow">
          <p className="font-display text-2xl">Could not get your location</p>
          <p className="text-sm">{step.reason} Call 112 now.</p>
        </section>
      )}

      {smsHref && (
        <a href={smsHref} className="flex min-h-14 items-center justify-center rounded-full bg-ink font-display text-xl text-snow">
          Send SMS (with location)
        </a>
      )}

      <label className="flex flex-col gap-1">
        <span className="font-semibold">Family or friend&apos;s number (for SMS)</span>
        <input
          type="tel"
          inputMode="tel"
          value={contact}
          onChange={(e) => writeContact(e.target.value)}
          placeholder="+91…"
          className="min-h-12 rounded-xl border-2 border-ink/20 bg-snow px-3"
        />
        <span className="text-xs text-muted">Saved on this phone only. Leave empty to pick a contact in your SMS app.</span>
      </label>

      {native && (
        <section className="rounded-2xl border-2 border-ink/15 p-3">
          <button onClick={toggleRelay} role="switch" aria-checked={Boolean(mesh?.running)} className="flex min-h-12 w-full items-center justify-between gap-3 text-left">
            <span>
              <b>Help relay SOS (Bluetooth)</b>
              <span className="block text-sm text-muted">Pass on SOS calls from phones nearby that have no signal. Works without internet.</span>
            </span>
            <span className={`rounded-full px-3 py-1 text-sm font-bold ${mesh?.running ? "bg-green text-white" : "bg-ink/10"}`}>{mesh?.running ? "On" : "Off"}</span>
          </button>
          {mesh?.running && (
            <p className="mt-1 text-sm">
              Heard {mesh.heard} · passed on {mesh.relayed} · reached rescue {mesh.synced}
            </p>
          )}
          {meshNote && <p className="mt-1 text-sm font-semibold">{meshNote}</p>}
        </section>
      )}

      <div className="grid grid-cols-2 gap-2">
        <a href="tel:112" className="flex min-h-14 flex-col items-center justify-center rounded-2xl border-2 border-danger font-semibold text-danger">
          <span className="font-display text-2xl leading-none">112</span>
          <span className="text-xs">Police / Emergency</span>
        </a>
        <a href="tel:108" className="flex min-h-14 flex-col items-center justify-center rounded-2xl border-2 border-danger font-semibold text-danger">
          <span className="font-display text-2xl leading-none">108</span>
          <span className="text-xs">Ambulance</span>
        </a>
      </div>
    </div>
  );
}
