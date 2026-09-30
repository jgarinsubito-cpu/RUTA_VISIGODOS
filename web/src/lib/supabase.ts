"use client";
/**
 * Browser Supabase client for optional visitor accounts. Uses only the public project URL and the
 * publishable key; each account's data is protected by row-level security
 * (supabase/migrations). Never import a secret key into client code.
 *
 * Without configuration the app stays guest-only: supabase() returns null and the account screen
 * says accounts are not available.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Literal references: Next.js inlines NEXT_PUBLIC_ variables only when written out in full.
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let client: SupabaseClient | null | undefined;

export function supabaseConfigured(): boolean {
  return Boolean(URL && KEY);
}

/** Sign-in methods switched on in the Supabase project (public auth settings). */
export async function enabledProviders(): Promise<{ google: boolean; email: boolean }> {
  if (!URL || !KEY) return { google: false, email: false };
  try {
    const res = await fetch(`${URL}/auth/v1/settings`, { headers: { apikey: KEY } });
    const settings = (await res.json()) as { external?: Record<string, boolean> };
    return { google: settings.external?.google === true, email: settings.external?.email === true };
  } catch {
    return { google: false, email: true };
  }
}

export function supabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  client =
    URL && KEY && typeof window !== "undefined"
      ? createClient(URL, KEY, {
          // PKCE: Google sign-in, email confirmation and password links return a one-time ?code=
          // that the client exchanges on /cuenta (detectSessionInUrl).
          auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: "ruta-visigoda:auth" },
        })
      : null;
  return client;
}
