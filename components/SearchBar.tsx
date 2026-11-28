"use client";

import { useState, useSyncExternalStore } from "react";
import { canListen } from "@/lib/voice";
import { usePlaceSearch } from "@/lib/place-search";
import type { Place } from "@/lib/trip";

type Props = { onMenu: () => void; onPick: (place: Place) => void; onDirections: () => void; onVoice: () => void; listening: boolean };

const noSubscribe = () => () => {};

// Floating top bar: menu, "Search Himrakshak" with voice, and the green directions button.
export default function SearchBar({ onMenu, onPick, onDirections, onVoice, listening }: Props) {
  const [query, setQuery] = useState("");
  const { results, searching } = usePlaceSearch(query);
  // Only known in the browser; the server renders without the mic so hydration matches.
  const hasSpeech = useSyncExternalStore(noSubscribe, canListen, () => false);

  function pick(place: Place) {
    setQuery("");
    onPick(place);
  }

  return (
    <div className="pointer-events-auto relative">
      <div className="flex min-h-14 items-center gap-1 rounded-full bg-white py-1 pr-1 pl-1 shadow-lg">
        <button onClick={onMenu} aria-label="Menu" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && results[0] && pick(results[0])}
          placeholder={listening ? "Listening…" : "Search any place in Uttarakhand"}
          aria-label="Search Himrakshak"
          className="min-h-12 min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted"
        />
        {hasSpeech && (
          <button onClick={onVoice} aria-label="Voice command" className={`flex h-12 w-10 shrink-0 items-center justify-center ${listening ? "text-danger" : ""}`}>
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
              <path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.9V21h2v-2.1a7 7 0 0 0 6-6.9z" />
            </svg>
          </button>
        )}
        <button onClick={onDirections} aria-label="Directions" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green text-white">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
            <path d="M21.7 11.3 12.7 2.3a1 1 0 0 0-1.4 0l-9 9a1 1 0 0 0 0 1.4l9 9a1 1 0 0 0 1.4 0l9-9a1 1 0 0 0 0-1.4zM14 14.5V12h-4v3H8v-4a1 1 0 0 1 1-1h5V7.5l3.5 3.5z" />
          </svg>
        </button>
      </div>
      {query.trim() && (
        <ul className="absolute inset-x-0 top-full mt-2 overflow-hidden rounded-3xl bg-white shadow-xl">
          {searching && results.length === 0 && <li className="p-4 text-sm text-muted">Searching Uttarakhand…</li>}
          {!searching && results.length === 0 && <li className="p-4 text-sm text-muted">No place found in Uttarakhand.</li>}
          {results.map((p) => (
            <li key={`${p.name}-${p.lat}`}>
              <button onClick={() => pick(p)} className="flex min-h-12 w-full items-center gap-3 px-4 text-left hover:bg-mint">
                <span className="h-2.5 w-2.5 rounded-full bg-green" />
                <span className="truncate">{p.name}</span>
                {p.dham && <span className="ml-auto text-xs text-muted">Dham</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
