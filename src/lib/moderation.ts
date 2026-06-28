import { getSupabase } from "./supabase";
import { getClientId } from "./client-id";
import type { MessageKey } from "./i18n/messages";
import type { ReportType } from "./types";

/** Reasons a member of the public can flag a report. */
export type FlagReason = "spam" | "duplicate" | "inappropriate" | "resolved";

export const FLAG_REASONS: { value: FlagReason; labelKey: MessageKey }[] = [
  { value: "inappropriate", labelKey: "flag.inappropriate" },
  { value: "spam", labelKey: "flag.spam" },
  { value: "duplicate", labelKey: "flag.duplicate" },
  { value: "resolved", labelKey: "flag.resolved" },
];

/** Full moderation status set (mirrors the report_status enum). */
export type ModStatus =
  | "published"
  | "resolved"
  | "flagged"
  | "removed"
  | "merged";

/** A report as seen by a moderator (includes contact_phone + flag count). */
export interface ModReport {
  id: string;
  type: ReportType;
  title: string;
  description: string | null;
  lat: number | null;
  lng: number | null;
  addressText: string | null;
  status: ModStatus;
  contactPhone: string | null;
  imagePaths: string[];
  duplicateOf: string | null;
  createdAt: string;
  flagCount: number;
  clientUuid: string;
}

interface ModRow {
  id: string;
  type: ReportType;
  title: string;
  description: string | null;
  lat: number | null;
  lng: number | null;
  address_text: string | null;
  status: ModStatus;
  contact_phone: string | null;
  image_paths: string[];
  duplicate_of: string | null;
  created_at: string;
  flag_count: number;
  client_uuid: string;
}

function toModReport(r: ModRow): ModReport {
  return {
    id: r.id,
    type: r.type,
    title: r.title,
    description: r.description,
    lat: r.lat,
    lng: r.lng,
    addressText: r.address_text,
    status: r.status,
    contactPhone: r.contact_phone,
    imagePaths: r.image_paths ?? [],
    duplicateOf: r.duplicate_of,
    createdAt: r.created_at,
    flagCount: r.flag_count ?? 0,
    clientUuid: r.client_uuid,
  };
}

// ── Public flagging ────────────────────────────────────────────────────

/** Flag a report (anonymous). A unique-violation means this browser already
 * flagged it — treated as success. ≥3 distinct flags auto-hides the report. */
export async function flagReport(
  reportId: string,
  reason: FlagReason,
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Sin conexión al servidor.");
  const { error } = await supabase
    .from("report_flags")
    .insert({ report_id: reportId, reason, client_uuid: getClientId() });
  if (error && error.code !== "23505") throw error;
}

// ── Moderator auth ─────────────────────────────────────────────────────

/** Send a magic-link sign-in email; the link returns to /admin. */
export async function signInWithEmail(email: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Sin conexión al servidor.");
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo:
        typeof window !== "undefined"
          ? `${window.location.origin}/admin`
          : undefined,
    },
  });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  await getSupabase()?.auth.signOut();
}

/** Whether the signed-in user is on the moderators allowlist (RLS-enforced). */
export async function checkIsModerator(): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  const { data } = await supabase.from("moderators").select("user_id").maybeSingle();
  return Boolean(data);
}

// ── Moderator actions (RLS allows these only for moderators) ────────────

async function patchReport(
  id: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Sin conexión al servidor.");
  const { error } = await supabase.from("reports").update(patch).eq("id", id);
  if (error) throw error;
}

export const resolveReport = (id: string) => patchReport(id, { status: "resolved" });
export const removeReport = (id: string) => patchReport(id, { status: "removed" });
export const restoreReport = (id: string) => patchReport(id, { status: "published" });

/** Mark `id` as a duplicate merged into `targetId` (hidden from the public). */
export const mergeReport = (id: string, targetId: string) =>
  patchReport(id, { status: "merged", duplicate_of: targetId });

/** Delete a report's flags and re-publish it (dismiss false flags). */
export async function clearFlags(id: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Sin conexión al servidor.");
  const { error } = await supabase
    .from("report_flags")
    .delete()
    .eq("report_id", id);
  if (error) throw error;
  await restoreReport(id);
}

// ── Moderator reads ────────────────────────────────────────────────────

export async function fetchModerationReports(
  statuses: ModStatus[],
): Promise<ModReport[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("reports_moderation")
    .select("*")
    .in("status", statuses)
    .order("flag_count", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return ((data ?? []) as unknown as ModRow[]).map(toModReport);
}

/** Likely duplicates of a report (same type, near, recent, similar title). */
export async function fetchDuplicates(id: string): Promise<ModReport[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("nearby_duplicates", { p_id: id });
  if (error) throw error;
  // The RPC returns base report rows (location as geography is ignored here).
  return ((data ?? []) as unknown as ModRow[]).map((r) => ({
    ...toModReport({ ...r, lat: null, lng: null, flag_count: 0 }),
  }));
}
