/** Shared domain types for the reporting flow. Mirrors the DB schema in
 * `supabase/migrations/0001_init.sql` and the taxonomy in DESIGN.md. */

/** The 4-color taxonomy (DESIGN.md). Stored as the report's `type`. */
export type ReportType = "emergency" | "need" | "info" | "resolved" | "pet";

/** Local sync lifecycle of a queued report (IndexedDB outbox). Distinct from
 * the server-side moderation `status` (pending/verified/flagged/resolved). */
export type SyncStatus = "pending" | "syncing" | "synced" | "error";

/** What the form produces. Images are already compressed WebP blobs. */
export interface ReportInput {
  type: ReportType;
  title: string;
  description?: string;
  lat?: number;
  lng?: number;
  addressText?: string;
  contactPhone?: string;
  images: Blob[];
}

/** A report as stored in the local outbox (IndexedDB via Dexie). */
export interface OutboxReport extends ReportInput {
  /** Client-generated UUID — primary key + idempotency key for sync upsert. */
  clientUuid: string;
  status: SyncStatus;
  /** Epoch ms. */
  createdAt: number;
  syncedAt?: number;
  /** Supabase row id once synced. */
  remoteId?: string;
  /** Last sync error message, if status === "error". */
  error?: string;
}
