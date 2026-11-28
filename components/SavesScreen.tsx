"use client";

import { useState } from "react";
import Link from "next/link";
import { getGpsFix } from "@/lib/sos";
import type { SavedPlace } from "@/lib/saved-places";
import Icon, { type IconName } from "@/components/Icon";
import { useRewards } from "@/lib/rewards";
import { useContributions } from "@/lib/contributions";
import { deviceId } from "@/lib/device";

type Props = {
  signedIn: boolean;
  places: SavedPlace[];
  error: string | null;
  onSave: (place: Omit<SavedPlace, "id">) => Promise<string | null>;
  onRemove: (id: string) => void;
  onShow: (place: SavedPlace) => void;
  onClose: () => void;
};

function SignInCard({ onClose }: { onClose: () => void }) {
  return (
    <div className="animate-fade fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-6" onClick={onClose}>
      <div role="dialog" aria-modal className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <svg viewBox="0 0 200 110" className="mx-auto h-36 w-full rounded-2xl bg-mint" aria-hidden>
          <rect x="82" y="10" width="40" height="80" rx="7" fill="#fff" stroke="#0e7a3d" strokeWidth="3" />
          <circle cx="102" cy="36" r="8" fill="#0e7a3d" />
          <rect x="90" y="52" width="24" height="5" rx="2.5" fill="#0e7a3d" opacity=".5" />
          <rect x="90" y="62" width="24" height="5" rx="2.5" fill="#0e7a3d" opacity=".5" />
          <path d="M58 55l18 7v14c0 10-8 17-18 21-10-4-18-11-18-21V62z" fill="#0e7a3d" />
          <path d="M50 78l6 6 11-12" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M150 40a10 10 0 0 0-10 10c0 8 10 18 10 18s10-10 10-18a10 10 0 0 0-10-10z" fill="#0e7a3d" />
        </svg>
        <h2 className="mt-4 font-display text-2xl font-bold">My Saves</h2>
        <p className="mt-1 text-sm text-muted">Please sign in to add to a list. Signing in allows you to create and add to list.</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button onClick={onClose} className="min-h-12 rounded-full border-2 border-green font-semibold text-green">
            Cancel
          </button>
          <Link href="/login" className="flex min-h-12 items-center justify-center rounded-full bg-green font-semibold text-white">
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}

type Group = { list: string; icon: IconName; title: string; empty: string };

const GROUPS: Group[] = [
  { list: "Home", icon: "home", title: "Home", empty: "Set Address" },
  { list: "Work", icon: "work", title: "Work", empty: "Set Address" },
  { list: "Favourites", icon: "heart", title: "Favourites", empty: "0 places" },
  { list: "Point On Map", icon: "pin", title: "Point On Map", empty: "0 places" },
];

// My Saves, as in the design: My Places (Home, Work, Favourites, Point On Map), Click and Post, Earn.
export default function SavesScreen({ signedIn, places, error, onSave, onRemove, onShow, onClose }: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const rewards = useRewards();
  const { items } = useContributions();
  const me = typeof window === "undefined" ? null : deviceId();
  const photos = items.filter((c) => c.device_id === me).reduce((n, c) => n + c.photo_urls.length, 0);
  if (!signedIn) return <SignInCard onClose={onClose} />;

  // Home and Work hold one place; the other lists grow.
  async function saveHere(list: string) {
    setStatus("Getting your location…");
    try {
      const fix = await getGpsFix();
      if (list === "Home" || list === "Work") places.filter((p) => p.list_name === list).forEach((p) => onRemove(p.id));
      const error = await onSave({ list_name: list, name: list === "Home" || list === "Work" ? list : `My place ${new Date().toLocaleDateString("en-IN")}`, lat: fix.lat, lon: fix.lon });
      setStatus(error ? `Could not save: ${error}` : `Saved your location to ${list}`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not get your location");
    }
  }

  return (
    <section className="animate-sheet absolute inset-x-0 bottom-0 z-20 flex max-h-[80dvh] flex-col rounded-t-3xl bg-white pb-28 shadow-[0_-8px_24px_rgba(20,35,31,0.18)]" aria-label="My Saves">
      <button onClick={onClose} aria-label="Close" className="flex min-h-10 shrink-0 items-center justify-center">
        <span className="h-1.5 w-12 rounded-full bg-ink/25" />
      </button>
      <div className="flex flex-col gap-3 overflow-y-auto px-4">
        <h2 className="font-display text-2xl font-bold">My Saves</h2>
        {error && <p className="text-sm text-danger">{error}</p>}
        <section className="rounded-3xl border border-ink/10 p-3 shadow-sm">
          <h3 className="mb-1 flex items-center gap-2 font-display text-lg font-semibold">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-mint text-green">
              <Icon name="pin" />
            </span>
            My Places
          </h3>
          {GROUPS.map((g) => {
            const list = places.filter((p) => p.list_name === g.list);
            const single = g.list === "Home" || g.list === "Work";
            return (
              <div key={g.list} className="border-t border-ink/5 first-of-type:border-0">
                <button onClick={() => setOpen(open === g.list ? null : g.list)} className="flex min-h-14 w-full items-center gap-3 text-left">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-mint text-green">
                    <Icon name={g.icon} className="h-5 w-5" />
                  </span>
                  <span className="flex-1">
                    <b>{g.title}</b>
                    <span className="block text-xs text-muted">{list.length === 0 ? g.empty : single ? "Saved" : `${list.length} places`}</span>
                  </span>
                  <Icon name="chevron" className={`h-4 w-4 text-muted ${open === g.list ? "rotate-90" : ""}`} />
                </button>
                {open === g.list && (
                  <div className="pb-2 pl-12">
                    {list.map((p) => (
                      <div key={p.id} className="flex items-center gap-2">
                        <button onClick={() => onShow(p)} className="min-h-11 min-w-0 flex-1 truncate text-left text-sm underline">
                          {p.name} · show on map
                        </button>
                        <button onClick={() => onRemove(p.id)} aria-label={`Remove ${p.name}`} className="flex h-11 w-11 items-center justify-center text-muted">
                          <Icon name="close" className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <button onClick={() => saveHere(g.list)} className="mt-1 min-h-11 rounded-full bg-green px-4 text-sm font-semibold text-white">
                      {single && list.length ? `Set ${g.title} to my location` : single ? "Set Address: my location" : "+ Save my location here"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </section>
        {status && <p className="text-sm text-muted">{status}</p>}
        <Link href="/events" className="flex min-h-16 items-center gap-3 rounded-3xl border border-ink/10 p-3 shadow-sm">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-mint text-green">
            <Icon name="camera" className="h-5 w-5" />
          </span>
          <span className="flex-1">
            <b>Click and Post</b>
            <span className="block text-xs text-muted">{photos} photos</span>
          </span>
          <Icon name="chevron" className="h-4 w-4 text-muted" />
        </Link>
        <Link href="/earn" className="flex min-h-16 items-center gap-3 rounded-3xl border border-ink/10 p-3 shadow-sm">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-orange/20 text-orange">
            <Icon name="coin" className="h-5 w-5" />
          </span>
          <span className="flex-1">
            <b>Earn</b>
            <span className="block text-xs text-muted">{rewards ? `₹${rewards.points} earned` : "₹0 earned"}</span>
          </span>
          <Icon name="chevron" className="h-4 w-4 text-muted" />
        </Link>
      </div>
    </section>
  );
}
