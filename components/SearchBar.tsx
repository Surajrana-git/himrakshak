"use client";

import { useState, useSyncExternalStore } from "react";
import { PLACES, type Place } from "@/lib/trip";

type Props = { onMenu: () => void; onPick: (place: Place) => void; onDirections: () => void };

// Chrome's built-in speech API (no key). Missing on some browsers, so the mic hides there.
type Recognition = { lang: string; onresult: (e: { results: { 0: { transcript: string } }[] }) => void; onend: () => void; start: () => void };
function speechRecognition(): (new () => Recognition) | null {
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const noSubscribe = () => () => {};

function match(query: string): Place[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return PLACES.filter((p) => p.name.toLowerCase().includes(q) || p.hindi.includes(query.trim())).slice(0, 6);
}

// Floating top bar: menu, "Search for Safest Way" with voice, and the green directions button.
export default function SearchBar({ onMenu, onPick, onDirections }: Props) {
  const [query, setQuery] = useState("");
  const [listening, setListening] = useState(false);
  const results = match(query);
  // Only known in the browser; the server renders without the mic so hydration matches.
  const hasSpeech = useSyncExternalStore(noSubscribe, () => speechRecognition() !== null, () => false);

  function listen() {
    const Speech = speechRecognition();
    if (!Speech) return;
    const rec = new Speech();
    rec.lang = "hi-IN";
    rec.onresult = (e) => setQuery(e.results[0][0].transcript);
    rec.onend = () => setListening(false);
    setListening(true);
    rec.start();
  }

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
          placeholder={listening ? "Boliye… / Listening…" : "Search for Safest Way"}
          aria-label="Search for Safest Way"
          className="min-h-12 min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted"
        />
        {hasSpeech && (
          <button onClick={listen} aria-label="Bolkar dhoondhein / Voice search" className={`flex h-12 w-10 shrink-0 items-center justify-center ${listening ? "text-danger" : ""}`}>
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
              <path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.9V21h2v-2.1a7 7 0 0 0 6-6.9z" />
            </svg>
          </button>
        )}
        <button onClick={onDirections} aria-label="Rasta / Directions" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green text-white">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
            <path d="M21.7 11.3 12.7 2.3a1 1 0 0 0-1.4 0l-9 9a1 1 0 0 0 0 1.4l9 9a1 1 0 0 0 1.4 0l9-9a1 1 0 0 0 0-1.4zM14 14.5V12h-4v3H8v-4a1 1 0 0 1 1-1h5V7.5l3.5 3.5z" />
          </svg>
        </button>
      </div>
      {query.trim() && (
        <ul className="absolute inset-x-0 top-full mt-2 overflow-hidden rounded-3xl bg-white shadow-xl">
          {results.length === 0 && <li className="p-4 text-sm text-muted">Is naam ki jagah list mein nahi hai.</li>}
          {results.map((p) => (
            <li key={p.name}>
              <button onClick={() => pick(p)} className="flex min-h-12 w-full items-center gap-3 px-4 text-left hover:bg-mint">
                <span className="h-2.5 w-2.5 rounded-full bg-green" />
                {p.hindi} · {p.name}
                {p.dham && <span className="ml-auto text-xs text-muted">Dham</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
