import { getSupabase, REPORT_IMAGES_BUCKET } from "./supabase";
import { logError } from "./log";
import type { ReportType } from "./types";

/** A publicly-visible report (verified/resolved), as exposed by the
 * `reports_public` view. Never includes contact_phone. */
export interface PublicReport {
  id: string;
  type: ReportType;
  title: string;
  description: string | null;
  lat: number | null;
  lng: number | null;
  addressText: string | null;
  status: "published" | "resolved";
  imagePaths: string[];
  createdAt: string;
}

interface PublicRow {
  id: string;
  type: ReportType;
  title: string;
  description: string | null;
  lat: number | null;
  lng: number | null;
  address_text: string | null;
  status: "published" | "resolved";
  image_paths: string[];
  created_at: string;
}

const COLUMNS =
  "id,type,title,description,lat,lng,address_text,status,image_paths,created_at";

function toReport(r: PublicRow): PublicReport {
  return {
    id: r.id,
    type: r.type,
    title: r.title,
    description: r.description,
    lat: r.lat,
    lng: r.lng,
    addressText: r.address_text,
    status: r.status,
    imagePaths: r.image_paths ?? [],
    createdAt: r.created_at,
  };
}

/**
 * Fetch public reports, newest first. Returns `[]` when Supabase isn't
 * configured (the app still renders an empty feed). `before` is an ISO
 * timestamp for keyset pagination; `withCoordsOnly` is for the map.
 */
export async function fetchReports(opts: {
  types?: ReportType[];
  limit?: number;
  before?: string;
  withCoordsOnly?: boolean;
} = {}): Promise<PublicReport[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  let query = supabase
    .from("reports_public")
    .select(COLUMNS)
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 20);

  if (opts.types?.length) query = query.in("type", opts.types);
  if (opts.before) query = query.lt("created_at", opts.before);
  if (opts.withCoordsOnly) query = query.not("lat", "is", null);

  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as unknown as PublicRow[]).map(toReport);
}

/** Fetch one public report by id, or null. Usable server-side (RSC). */
export async function fetchReportById(
  id: string,
): Promise<PublicReport | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("reports_public")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    logError("feed", "fetchReportById failed", id, error.message);
    throw error;
  }
  return data ? toReport(data as unknown as PublicRow) : null;
}

/** Public URL for a stored report image, or null when unconfigured. */
export function reportImageUrl(path: string): string | null {
  const supabase = getSupabase();
  if (!supabase) return null;
  return supabase.storage.from(REPORT_IMAGES_BUCKET).getPublicUrl(path).data
    .publicUrl;
}

/**
 * Subscribe to report changes (Supabase Realtime) and call `onChange` on any
 * insert/update — the feed/map refetch in response. No-op without Supabase.
 * Returns an unsubscribe function.
 */
export function subscribeReports(onChange: () => void): () => void {
  const supabase = getSupabase();
  if (!supabase) return () => {};
  const channel = supabase
    .channel("reports-feed")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "reports" },
      () => onChange(),
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}
