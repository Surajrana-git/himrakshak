"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type SavedRoute = {
  id: string;
  created_at: string;
  name: string;
  mode: string;
  from_name: string;
  from_lat: number;
  from_lon: number;
  to_name: string;
  to_lat: number;
  to_lon: number;
  km: number;
  hours: number;
  risk: number;
};

// The signed-in user's saved routes ("My Routes"); row-level security keeps them private.
export function useSavedRoutes(userId: string | null) {
  const [routes, setRoutes] = useState<SavedRoute[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!supabase || !userId) return;
    supabase
      .from("saved_routes")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        setError(error ? "Saved routes are not set up yet (run supabase/run-final.sql)." : null);
        setRoutes((data as SavedRoute[]) ?? []);
      });
  }, [userId, version]);

  const save = useCallback(async (route: Omit<SavedRoute, "id" | "created_at">) => {
    if (!supabase) return "The server is not configured";
    const { error } = await supabase.from("saved_routes").insert(route);
    setVersion((v) => v + 1);
    return error ? error.message : null;
  }, []);

  const remove = useCallback(async (id: string) => {
    if (!supabase) return;
    await supabase.from("saved_routes").delete().eq("id", id);
    setVersion((v) => v + 1);
  }, []);

  return { routes: userId ? routes : [], error, save, remove };
}
