"use client";

import { useSyncExternalStore } from "react";

export type Vehicle = {
  id: string;
  type: "Bike" | "Scooter" | "Car";
  name: string;
  registration: string;
  mileageKmpl: number;
  fuel: "Petrol" | "Diesel" | "CNG";
  pricePerLitre: number;
  maintenancePerKm: number;
};

// Kept on this phone: it is only used to work out trip cost.
const KEY = "himrakshak-vehicles";
const listeners = new Set<() => void>();

function read(): string {
  try {
    return localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

export function useVehicles(): Vehicle[] {
  const raw = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => "[]",
  );
  return JSON.parse(raw) as Vehicle[];
}

export function saveVehicle(v: Vehicle) {
  const all = (JSON.parse(read()) as Vehicle[]).filter((x) => x.id !== v.id);
  try {
    localStorage.setItem(KEY, JSON.stringify([v, ...all]));
  } catch {}
  listeners.forEach((cb) => cb());
}

// Trip cost the way the design sets it out: fuel = km ÷ mileage, cost = fuel × price + km × upkeep.
export function tripCost(km: number, v: Vehicle): { litres: number; rupees: number } {
  const litres = km / v.mileageKmpl;
  return { litres, rupees: litres * v.pricePerLitre + km * v.maintenancePerKm };
}
