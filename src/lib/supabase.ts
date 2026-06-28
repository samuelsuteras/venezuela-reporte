import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser Supabase client, created lazily from public env vars. The app is
 * usable with NO Supabase configured — reports still queue in the local outbox;
 * they just stay "en cola" until a backend exists. This keeps local dev and
 * offline use working without credentials. See `.env.example`.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True when both public env vars are present. Gate sync on this. */
export const isSupabaseConfigured = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

/** Returns the singleton client, or null when env vars are missing. */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  client ??= createClient(url!, anonKey!, {
    // Persist + detect session so moderator magic-link sign-in survives reloads
    // and the /admin redirect. Anonymous use simply has no session.
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return client;
}

/** Storage bucket that holds compressed report images. */
export const REPORT_IMAGES_BUCKET = "report-images";
