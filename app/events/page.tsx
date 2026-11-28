"use client";

import { useState } from "react";
import Screen, { Chips } from "@/components/Screen";
import Icon from "@/components/Icon";
import { approval, STATUS_LABEL, useContributions, type Contribution, type Status } from "@/lib/contributions";
import { confirmedBlocks, REPORT_KINDS, useReports, type Report } from "@/lib/reports";
import { distanceKm } from "@/lib/geo";
import { nearestPlace } from "@/lib/trip";
import { googlePlaceUrl } from "@/lib/google-maps";

const FILTERS = ["All Events", "Safety", "Travel", "Community", "Other"] as const;
type Filter = (typeof FILTERS)[number];
type Event = {
  id: string;
  at: string;
  group: Exclude<Filter, "All Events">;
  label: string;
  title: string;
  details: string | null;
  lat: number;
  lon: number;
  photo: string | null;
  status: Status;
  reason: string | null;
};

const SAFETY = ["Road Construction", "Landslide", "Rockfall", "Blocked Road", "Closed / Blocked Road", "Road Condition", "Traffic", "Weather", "Safety Info", "Water on road", "Road Issue"];

function fromContribution(c: Contribution, all: Contribution[]): Event {
  const status = approval(c, all);
  const group = c.kind === "hazard" || SAFETY.includes(c.category) ? "Safety" : c.kind === "place" ? "Travel" : c.kind === "post" ? "Community" : "Other";
  const label = { place: "New Place", fix: "Map Fix", post: c.category, hazard: "Road Alert" }[c.kind];
  // A rejected photo is never shown again.
  const photo = status === "rejected" ? null : (c.photo_urls[0] ?? null);
  return { id: c.id, at: c.created_at, group, label, title: c.title ?? c.category, details: c.details, lat: c.lat, lon: c.lon, photo, status, reason: c.ai_reason ?? null };
}

// A driver report is approved when a second phone reported the same spot (the road-closure rule).
function fromReport(r: Report, confirmed: { lat: number; lon: number }[]): Event {
  const status = confirmed.some((b) => distanceKm(b.lat, b.lon, r.lat, r.lon) < 1) ? "approved" : "pending";
  return { id: r.id, at: r.created_at, group: "Safety", label: "Road Alert", title: REPORT_KINDS[r.kind].label, details: r.note, lat: r.lat, lon: r.lon, photo: r.photo_url, status, reason: null };
}

const BADGE: Record<Status, string> = { approved: "bg-mint text-green-dark", pending: "bg-orange/20 text-ink", rejected: "bg-danger/15 text-danger" };

const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

// Everything travellers posted (places, fixes, updates, hazards) plus driver road reports, newest first.
export default function EventsPage() {
  const { items, error } = useContributions();
  const reports = useReports();
  const [filter, setFilter] = useState<Filter>("All Events");
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  // Reports load in the browser (none at build time, where the clock must not be read).
  const confirmed = reports.length ? confirmedBlocks(reports) : [];
  const events = [...items.filter((c) => c.visibility === "public").map((c) => fromContribution(c, items)), ...reports.map((r) => fromReport(r, confirmed))]
    .sort((a, b) => b.at.localeCompare(a.at))
    .filter((e) => filter === "All Events" || e.group === filter)
    .filter((e) => !q || `${e.title} ${e.label} ${e.details ?? ""} ${nearestPlace(e).name}`.toLowerCase().includes(q));

  return (
    <Screen title="View Posted Events" subtitle="Discover important events, updates, and activities near you.">
      <label className="flex min-h-12 items-center gap-2 rounded-full border-2 border-ink/15 px-4">
        <Icon name="search" className="h-5 w-5 text-muted" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search events (e.g., road work, camp, etc.)" className="min-w-0 flex-1 outline-none" />
      </label>
      <Chips options={FILTERS} value={filter} onChange={setFilter} label="Event type" />
      {error && <p className="text-sm text-muted">{error}</p>}
      {events.length === 0 && <p className="rounded-2xl bg-mint p-4 text-center">No events yet. Add one from the + button on the map.</p>}
      <ul className="flex flex-col gap-3">
        {events.map((e) => (
          <li key={e.id}>
            <a href={googlePlaceUrl(e.lat, e.lon)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-2xl border border-ink/10 p-2 shadow-sm">
              {e.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={e.photo} alt="" className="h-20 w-24 shrink-0 rounded-xl object-cover" />
              ) : (
                <span className="flex h-20 w-24 shrink-0 items-center justify-center rounded-xl bg-mint text-green">
                  <Icon name={e.group === "Safety" ? "hazard" : "pin"} className="h-8 w-8" />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className={`text-xs font-bold ${e.group === "Safety" ? "text-danger" : "text-green"}`}>{e.label}</span>
                <span className="block truncate font-display font-semibold">{e.title}</span>
                <span className="block truncate text-sm text-muted">Near {nearestPlace(e).name}, Uttarakhand</span>
                <span className="block text-xs text-muted">{when(e.at)}</span>
                <span className={`mt-1 inline-block rounded-full px-2 text-xs font-bold ${BADGE[e.status]}`}>
                  {STATUS_LABEL[e.status]}
                  {e.status === "approved" && " · on the map"}
                </span>
                {e.status === "rejected" && e.reason && <span className="block text-xs text-danger">AI: {e.reason}</span>}
              </span>
              <Icon name="chevron" className="h-5 w-5 text-muted" />
            </a>
          </li>
        ))}
      </ul>
    </Screen>
  );
}
