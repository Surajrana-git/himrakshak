"use client";

import { useState } from "react";
import { usePlaceSearch } from "@/lib/place-search";
import type { Place } from "@/lib/trip";

type Props = { label: string; value: Place | null; placeholder: string; onPick: (place: Place) => void };

// Google-Maps-style place box: shows the chosen place, type to search all of Uttarakhand.
export default function PlaceField({ label, value, placeholder, onPick }: Props) {
  const [query, setQuery] = useState<string | null>(null);
  const { results, searching } = usePlaceSearch(query ?? "");
  const open = query !== null && query.trim().length > 0;

  function pick(place: Place) {
    setQuery(null);
    onPick(place);
  }

  return (
    <label className="relative flex flex-col gap-1">
      <span className="text-sm font-semibold">{label}</span>
      <input
        value={query ?? value?.name ?? ""}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={(e) => e.target.select()}
        onBlur={() => setTimeout(() => setQuery(null), 150)}
        onKeyDown={(e) => e.key === "Enter" && results[0] && pick(results[0])}
        placeholder={placeholder}
        className="min-h-12 rounded-full border-2 border-ink/20 bg-white px-4 font-semibold outline-none focus:border-green"
      />
      {open && (
        <ul className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-2xl bg-white shadow-xl">
          {results.map((p) => (
            <li key={`${p.name}-${p.lat}`}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(p)}
                className="flex min-h-12 w-full items-center gap-3 px-4 text-left hover:bg-mint"
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-green" />
                <span className="truncate">{p.name}</span>
                {p.dham && <span className="ml-auto text-xs text-muted">Dham</span>}
              </button>
            </li>
          ))}
          {searching && <li className="p-3 text-sm text-muted">Searching Uttarakhand…</li>}
          {!searching && results.length === 0 && <li className="p-3 text-sm text-muted">No place found in Uttarakhand.</li>}
        </ul>
      )}
    </label>
  );
}
