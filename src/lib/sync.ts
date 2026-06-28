import { db } from "./db";
import { getSupabase, isSupabaseConfigured, REPORT_IMAGES_BUCKET } from "./supabase";
import { describeError, log, logError } from "./log";
import type { OutboxReport } from "./types";

/** Custom event fired after one or more reports sync — SyncToast listens. */
export const SYNCED_EVENT = "reporteve:synced";

// ponytail: module-level guard, single-tab assumption. If we ever need
// cross-tab coordination, move to a Web Lock (navigator.locks).
let flushing = false;

/**
 * Push every unsynced report (pending or errored) to Supabase: upload its
 * compressed images to Storage, then upsert the row (idempotent on
 * `client_uuid`, so retries never duplicate). Safe to call often — it no-ops
 * when Supabase isn't configured, when offline, or when already running.
 */
export async function flushOutbox(): Promise<void> {
  // Quiet skips (no remote log spam from the 30s timer).
  if (flushing) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  const supabase = getSupabase();
  if (!supabase) {
    // The single most common cause of a stuck "en espera" report: the public
    // Supabase env vars aren't present in this build/runtime.
    logError(
      "sync",
      "Supabase NOT configured — reports stay queued.",
      "Check NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are set AND the app was rebuilt after setting them (these are inlined at build time).",
      { isSupabaseConfigured },
    );
    return;
  }

  flushing = true;
  let syncedCount = 0;
  try {
    // Include "syncing": a report left in that state was orphaned by a refresh
    // or closed tab mid-send. Re-sending is safe (idempotent upsert), so we
    // always recover it instead of leaving it stuck forever.
    const queued = await db.outbox
      .where("status")
      .anyOf("pending", "error", "syncing")
      .sortBy("createdAt");
    if (queued.length === 0) return; // nothing to do — stay quiet
    log("sync", `flushing ${queued.length} queued report(s)`);

    for (const report of queued) {
      const ok = await syncOne(supabase, report);
      if (ok) syncedCount++;
    }
    log("sync", `done: ${syncedCount}/${queued.length} synced`);
  } finally {
    flushing = false;
  }

  if (syncedCount > 0 && typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(SYNCED_EVENT, { detail: { count: syncedCount } }),
    );
  }
}

/** Sync a single report. Returns true on success. Errors are recorded on the
 * row (status "error") and swallowed so one bad report can't block the queue. */
async function syncOne(
  supabase: NonNullable<ReturnType<typeof getSupabase>>,
  report: OutboxReport,
): Promise<boolean> {
  try {
    await db.outbox.update(report.clientUuid, {
      status: "syncing",
      error: undefined,
    });

    // 1. Upload images. upsert:false keeps RLS to INSERT-only; a 409 on retry
    //    means the object already landed, so we treat "already exists" as done.
    const imagePaths: string[] = [];
    for (let i = 0; i < report.images.length; i++) {
      const path = `${report.clientUuid}/${i}.webp`;
      const { error } = await supabase.storage
        .from(REPORT_IMAGES_BUCKET)
        .upload(path, report.images[i], {
          contentType: "image/webp",
          upsert: false,
        });
      if (error && !/exist/i.test(error.message)) throw error;
      imagePaths.push(path);
    }

    // 2. Upsert the row. PostGIS geography accepts EWKT text.
    const location =
      report.lat != null && report.lng != null
        ? `SRID=4326;POINT(${report.lng} ${report.lat})`
        : null;

    // ignoreDuplicates → INSERT ... ON CONFLICT DO NOTHING. No .select(): anon
    // has no SELECT policy on `reports` (public reads go through the
    // reports_public view), so a RETURNING/representation would be rejected by
    // RLS (42501). return=minimal inserts cleanly; a retry on a dropped
    // response is a harmless no-op.
    const { error } = await supabase
      .from("reports")
      .upsert(
        {
          client_uuid: report.clientUuid,
          type: report.type,
          title: report.title,
          description: report.description ?? null,
          location,
          address_text: report.addressText ?? null,
          contact_phone: report.contactPhone ?? null,
          image_paths: imagePaths,
        },
        { onConflict: "client_uuid", ignoreDuplicates: true },
      );
    if (error) throw error;

    await db.outbox.update(report.clientUuid, {
      status: "synced",
      syncedAt: Date.now(),
      error: undefined,
    });
    log("sync", "synced", report.clientUuid);
    return true;
  } catch (err) {
    const message = describeError(err);
    logError("sync", "failed", report.clientUuid, message, err);
    await db.outbox.update(report.clientUuid, { status: "error", error: message });
    return false;
  }
}
