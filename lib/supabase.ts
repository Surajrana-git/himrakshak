import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Null when keys are missing, so the map still works without reports.
export const supabase = url && key ? createClient(url, key) : null;
