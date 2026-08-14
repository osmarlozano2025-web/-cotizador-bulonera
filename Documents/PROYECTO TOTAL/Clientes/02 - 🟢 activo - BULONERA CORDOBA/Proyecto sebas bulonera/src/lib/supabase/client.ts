import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { environment } from "@/config/environment";

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const { supabaseUrl, supabaseAnonKey } = environment;
  if (supabaseUrl === null || supabaseAnonKey === null) {
    return null;
  }

  if (supabaseClient === null) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  return supabaseClient;
}

export function hasSupabaseClient(): boolean {
  return getSupabaseClient() !== null;
}
