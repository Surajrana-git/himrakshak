"use client";

import { useState } from "react";
import Screen, { PRIMARY } from "@/components/Screen";
import Icon from "@/components/Icon";
import PlaceField from "@/components/PlaceField";
import { getGpsFix } from "@/lib/sos";
import { distanceKm } from "@/lib/geo";
import type { Hotel } from "@/lib/geocode";
import type { Place } from "@/lib/trip";

const REPO = "https://github.com/Surajrana-git/himrakshak";
// Google's hotel panel shows live prices and booking sites for these dates and guests.
const bookingSearch = (h: Hotel, checkIn: string, checkOut: string, guests: number) =>
  `https://www.google.com/search?q=${encodeURIComponent(`${h.name} ${h.address} hotel ${checkIn && checkOut ? `${checkIn} to ${checkOut}` : ""} ${guests} adults`)}`;

// Places to stay near you or near any town (OpenStreetMap). Prices and booking open in Google Maps.
export default function HotelsPage() {
  const [near, setNear] = useState<Place | null>(null);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(2);
  const [hotels, setHotels] = useState<Hotel[] | null>(null);
  const [from, setFrom] = useState<{ lat: number; lon: number } | null>(null);
  const [status, setStatus] = useState("");

  async function search(nearMe = false) {
    setStatus("Searching hotels…");
    let point = !nearMe && near ? { lat: near.lat, lon: near.lon } : null;
    if (!point) {
      try {
        const f = await getGpsFix();
        point = { lat: f.lat, lon: f.lon };
      } catch {
        return setStatus("Turn on location, or type a town to search near.");
      }
    }
    setFrom(point);
    const res = await fetch(`/api/hotels?lat=${point.lat}&lon=${point.lon}`).catch(() => null);
    const body: { hotels: Hotel[] } = res?.ok ? await res.json() : { hotels: [] };
    setHotels(body.hotels);
    setStatus(body.hotels.length ? "" : "No hotels found here. Try a bigger town nearby.");
  }

  return (
    <Screen icon="bed" title="Search Near by Hotels" subtitle="Find a safe place to stay before the road gets dark.">
      <PlaceField label="Near" value={near} placeholder="Search a town, or leave empty for near you" onPick={setNear} />
      <div className="grid grid-cols-3 gap-2 rounded-2xl border border-ink/10 p-2 text-xs font-semibold">
        <label>
          Check-in
          <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="mt-1 w-full rounded-lg border border-ink/15 p-1 font-normal" />
        </label>
        <label>
          Check-out
          <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="mt-1 w-full rounded-lg border border-ink/15 p-1 font-normal" />
        </label>
        <label>
          Guests
          <select value={guests} onChange={(e) => setGuests(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-ink/15 bg-white p-1 font-normal">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n} Adult{n > 1 ? "s" : ""}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button onClick={() => search(false)} className={PRIMARY}>
        <Icon name="search" /> Search Hotels
      </button>
      {status && <p className="text-center text-sm text-muted">{status}</p>}
      <ul className="flex flex-col gap-3">
        {hotels?.map((h) => (
          <li key={`${h.name}${h.lat}`} className="rounded-3xl border border-ink/10 p-4 shadow-sm">
            <p className="text-xs font-bold text-green uppercase">{h.kind}</p>
            <h2 className="font-display text-lg font-semibold">{h.name}</h2>
            <p className="flex items-center gap-1 text-sm text-muted">
              <Icon name="pin" className="h-4 w-4" />
              {h.address || "Uttarakhand"}
              {from && ` · ${distanceKm(from.lat, from.lon, h.lat, h.lon).toFixed(1)} km away`}
            </p>
            <a
              href={bookingSearch(h, checkIn, checkOut, guests)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex min-h-12 items-center justify-center rounded-full bg-green font-semibold text-white"
            >
              Book Now · see prices
            </a>
          </li>
        ))}
      </ul>
      <section className="flex items-center justify-between gap-3 rounded-2xl border border-ink/10 p-4">
        <p className="font-semibold">Check out the hotels listed near you</p>
        <button
          onClick={() => {
            setNear(null);
            search(true);
          }}
          className="flex min-h-11 shrink-0 items-center gap-1 rounded-full bg-green px-4 text-sm font-semibold text-white"
        >
          <Icon name="locate" className="h-4 w-4" /> Near by You
        </button>
      </section>
      <div className="text-center text-sm">
        <p className="font-semibold">Need help getting started?</p>
        <div className="mt-2 flex justify-center gap-6 text-green">
          <a href={`${REPO}/issues`} className="flex items-center gap-1">
            <Icon name="phone" className="h-4 w-4" /> Call Support
          </a>
          <a href={`${REPO}/issues/new`} className="flex items-center gap-1">
            <Icon name="edit" className="h-4 w-4" /> Write to us
          </a>
        </div>
      </div>
      <p className="text-xs text-muted">Hotels from OpenStreetMap. Himrakshak does not take bookings or payments.</p>
    </Screen>
  );
}
