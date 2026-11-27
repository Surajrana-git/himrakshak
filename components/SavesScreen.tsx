"use client";

import { useState } from "react";
import Link from "next/link";
import { getGpsFix } from "@/lib/sos";
import type { SavedPlace } from "@/lib/saved-places";

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

// Saved places grouped by the user's own lists; a new list starts with the current location.
export default function SavesScreen({ signedIn, places, error, onSave, onRemove, onShow, onClose }: Props) {
  const [listName, setListName] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  if (!signedIn) return <SignInCard onClose={onClose} />;

  const lists = [...new Set(places.map((p) => p.list_name))];

  async function saveHere(e: React.FormEvent) {
    e.preventDefault();
    setStatus("Location le rahe hain…");
    try {
      const fix = await getGpsFix();
      const error = await onSave({ list_name: listName.trim() || "Favourites", name: `Meri jagah ${new Date().toLocaleDateString("en-IN")}`, lat: fix.lat, lon: fix.lon });
      setStatus(error ? `Save nahi hua: ${error}` : "Save ho gaya");
      if (!error) setListName("");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Location nahi mili");
    }
  }

  return (
    <section className="animate-sheet absolute inset-x-0 bottom-0 z-20 flex max-h-[75dvh] flex-col rounded-t-3xl bg-white pb-28 shadow-[0_-8px_24px_rgba(20,35,31,0.18)]" aria-label="My Saves">
      <button onClick={onClose} aria-label="Band karein / Close" className="flex min-h-10 shrink-0 items-center justify-center">
        <span className="h-1.5 w-12 rounded-full bg-ink/25" />
      </button>
      <div className="flex flex-col gap-4 overflow-y-auto px-4">
        <h2 className="font-display text-2xl font-bold">My Saves</h2>
        <form onSubmit={saveHere} className="flex gap-2">
          <input
            value={listName}
            onChange={(e) => setListName(e.target.value)}
            placeholder="Nayi list ka naam / New list"
            maxLength={40}
            className="min-h-12 min-w-0 flex-1 rounded-full border border-green/40 px-4 outline-none focus:border-green"
          />
          <button className="min-h-12 shrink-0 rounded-full bg-green px-4 text-sm font-semibold text-white">+ Yahan save</button>
        </form>
        {status && <p className="text-sm text-muted">{status}</p>}
        {error && <p className="text-sm text-danger">{error}</p>}
        {places.length === 0 && !error && <p className="text-sm text-muted">Abhi kuch save nahi hai. Places tab se ya upar se jagah save karein.</p>}
        {lists.map((list) => (
          <section key={list}>
            <h3 className="font-semibold text-green">{list}</h3>
            <ul className="mt-1 flex flex-col divide-y divide-ink/10">
              {places
                .filter((p) => p.list_name === list)
                .map((p) => (
                  <li key={p.id} className="flex items-center gap-2 py-1">
                    <button onClick={() => onShow(p)} className="min-h-12 min-w-0 flex-1 truncate text-left">
                      {p.name}
                    </button>
                    <button onClick={() => onRemove(p.id)} aria-label={`${p.name} hatayein / Remove`} className="flex h-12 w-12 items-center justify-center text-muted">
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                        <path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13" />
                      </svg>
                    </button>
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>
    </section>
  );
}
