import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client factory, using the service-role key.
 *
 * `server-only` turns an accidental import from client-bundled code into a
 * build error rather than a leaked secret. This app does not use Supabase
 * Auth — the service-role key bypasses Row Level Security, so every caller
 * of the data layer built on top of this client MUST filter by a `userId`
 * obtained from Clerk's `auth()` (never trust a client-supplied id).
 */
let cached: SupabaseClient | null = null;

export function getSupabaseServerClient(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).",
    );
  }

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
