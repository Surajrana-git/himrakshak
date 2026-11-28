"use client";

import { useEffect, useState } from "react";
import { PLACES, type Place } from "@/lib/trip";

// Known towns and dhams first (instant, offline), then any other place in Uttarakhand from the
// search server, fetched 300 ms after the user stops typing.
export function usePlaceSearch(query: string): { results: Place[]; searching: boolean } {
  const q = query.trim().toLowerCase();
  const local = q ? PLACES.filter((p) => p.name.toLowerCase().includes(q) || (p.hindi && p.hindi.includes(query.trim()))).slice(0, 4) : [];
  const [remote, setRemote] = useState<{ q: string; places: Place[] } | null>(null);

  useEffect(() => {
    if (q.length < 2) return;
    let stale = false;
    const timer = setTimeout(() => {
      fetch(`/api/places?q=${encodeURIComponent(q)}`)
        .then((res) => (res.ok ? res.json() : { places: [] }))
        .then((body: { places: Place[] }) => !stale && setRemote({ q, places: body.places }))
        .catch(() => !stale && setRemote({ q, places: [] }));
    }, 300);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [q]);

  const fresh = remote?.q === q ? remote.places : [];
  const near = (a: Place, b: Place) => Math.abs(a.lat - b.lat) < 0.02 && Math.abs(a.lon - b.lon) < 0.02;
  const results = [...local, ...fresh.filter((r) => !local.some((l) => near(l, r)))].slice(0, 7);
  return { results, searching: q.length >= 2 && remote?.q !== q };
}
