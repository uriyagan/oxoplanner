"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

let cached: SupabaseClient | null = null;

/** Singleton browser Supabase client (anon key, persisted session for admin auth). */
export function getBrowserSupabase(): SupabaseClient {
  if (!cached) {
    cached = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return cached;
}
