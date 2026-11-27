"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type SavedPlace = { id: string; list_name: string; name: string; lat: number; lon: number };

// The signed-in user's saved places (row-level security keeps them private).
export function useSavedPlaces(userId: string | null) {
  const [places, setPlaces] = useState<SavedPlace[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!supabase || !userId) return;
    supabase
      .from("saved_places")
      .select("id, list_name, name, lat, lon")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        setError(error ? `Could not load saved places: ${error.message}` : null);
        setPlaces(data ?? []);
      });
  }, [userId, version]);

  const save = useCallback(async (place: Omit<SavedPlace, "id">) => {
    if (!supabase) return "The server is not configured";
    const { error } = await supabase.from("saved_places").insert(place);
    setVersion((v) => v + 1);
    return error ? error.message : null;
  }, []);

  const remove = useCallback(async (id: string) => {
    if (!supabase) return;
    await supabase.from("saved_places").delete().eq("id", id);
    setVersion((v) => v + 1);
  }, []);

  return { places: userId ? places : [], error, save, remove };
}
