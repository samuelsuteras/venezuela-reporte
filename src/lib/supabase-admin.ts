import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client for server-side writes that bypass RLS
 * (the /api/extract route writes `extracted` back to reports/notes). Returns
 * null when the URL or service key is missing, so the route no-ops instead of
 * crashing in an unconfigured environment. NEVER import this in client code —
 * the service key must never reach the browser.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function getAdminSupabase(): SupabaseClient | null {
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
