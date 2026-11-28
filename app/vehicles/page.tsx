"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Screen, { Card, Chips, PRIMARY } from "@/components/Screen";
import Icon from "@/components/Icon";
import { saveVehicle, type Vehicle } from "@/lib/vehicles";

const INPUT = "min-h-12 w-full rounded-full border-2 border-ink/15 px-4";

export default function VehiclePage() {
  const router = useRouter();
  const [type, setType] = useState<Vehicle["type"]>("Bike");
  const [name, setName] = useState("");
  const [registration, setRegistration] = useState("");
  const [mileage, setMileage] = useState("");
  const [fuel, setFuel] = useState<Vehicle["fuel"]>("Petrol");
  const [price, setPrice] = useState("");
  const [upkeep, setUpkeep] = useState("");
  const [error, setError] = useState("");

  function save() {
    const m = Number(mileage);
    const p = Number(price);
    if (!name.trim()) return setError("Enter the vehicle name");
    if (!(m > 0)) return setError("Enter mileage in km per litre");
    if (!(p > 0)) return setError("Enter the fuel price per litre");
    saveVehicle({
      id: crypto.randomUUID(),
      type,
      name: name.trim(),
      registration: registration.trim().toUpperCase(),
      mileageKmpl: m,
      fuel,
      pricePerLitre: p,
      maintenancePerKm: Math.max(0, Number(upkeep) || 0),
    });
    router.back();
  }

  return (
    <Screen
      icon="car"
      title="Add / Edit Vehicle Details"
      subtitle="Save your vehicle information for quick travel cost calculation."
      footer={
        <>
          {error && <p className="mb-2 text-center text-sm font-semibold text-danger">{error}</p>}
          <button onClick={save} className={PRIMARY}>
            <Icon name="check" /> Save Vehicle
          </button>
        </>
      }
    >
      <Card title="Vehicle Information">
        <p className="mb-2 text-sm font-semibold">Vehicle Type *</p>
        <Chips options={["Bike", "Scooter", "Car"] as const} value={type} onChange={setType} label="Vehicle type" />
        <label className="mt-3 block text-sm font-semibold">
          Vehicle Name *
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Bike (Hero Splendor)" className={`${INPUT} mt-1 font-normal`} />
        </label>
        <label className="mt-3 block text-sm font-semibold">
          Registration Number (optional)
          <input value={registration} onChange={(e) => setRegistration(e.target.value)} placeholder="e.g., UK07AB1234" className={`${INPUT} mt-1 font-normal`} />
        </label>
      </Card>
      <Card title="Fuel & Mileage Details">
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm font-semibold">
            Mileage * (km/L)
            <input inputMode="decimal" value={mileage} onChange={(e) => setMileage(e.target.value)} placeholder="45" className={`${INPUT} mt-1 font-normal`} />
          </label>
          <label className="text-sm font-semibold">
            Fuel Type *
            <select value={fuel} onChange={(e) => setFuel(e.target.value as Vehicle["fuel"])} className={`${INPUT} mt-1 bg-white font-normal`}>
              <option>Petrol</option>
              <option>Diesel</option>
              <option>CNG</option>
            </select>
          </label>
        </div>
      </Card>
      <Card title="Fuel Price (Current)" hint="Current price in your area. You can update it any time.">
        <label className="text-sm font-semibold">
          Price * (₹ / litre)
          <input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="105" className={`${INPUT} mt-1 font-normal`} />
        </label>
      </Card>
      <Card title="Maintenance (Optional)" hint="Used for vehicle wear and maintenance (e.g., ₹1–2 per km).">
        <label className="text-sm font-semibold">
          Maintenance Rate (₹ / km)
          <input inputMode="decimal" value={upkeep} onChange={(e) => setUpkeep(e.target.value)} placeholder="1" className={`${INPUT} mt-1 font-normal`} />
        </label>
      </Card>
    </Screen>
  );
}
