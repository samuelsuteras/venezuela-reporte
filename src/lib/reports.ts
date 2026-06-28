import imageCompression from "browser-image-compression";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db";
import { flushOutbox } from "./sync";
import type { OutboxReport, ReportInput } from "./types";

/**
 * Compress an image to a small WebP blob BEFORE it ever touches the outbox or
 * the network — the single biggest bandwidth win for 2G users (DESIGN.md
 * § Low-Bandwidth). Targets ~100KB / 1280px. Runs in a web worker.
 */
export async function compressImage(file: File): Promise<Blob> {
  return imageCompression(file, {
    maxSizeMB: 0.12,
    maxWidthOrHeight: 1280,
    fileType: "image/webp",
    initialQuality: 0.7,
    useWebWorker: true,
  });
}

/**
 * Queue a report locally (works fully offline) and kick a best-effort sync.
 * Returns the client UUID. The report appears in "Mi reporte" immediately with
 * a "pending" status; `flushOutbox` pushes it to Supabase when possible.
 */
export async function enqueueReport(input: ReportInput): Promise<string> {
  const report: OutboxReport = {
    ...input,
    clientUuid: crypto.randomUUID(),
    status: "pending",
    createdAt: Date.now(),
  };
  await db.outbox.add(report);
  // Fire and forget — never block the user on the network.
  void flushOutbox();
  return report.clientUuid;
}

/** Live list of the user's reports, newest first (reactive via Dexie). */
export function useMyReports(): OutboxReport[] | undefined {
  return useLiveQuery(() =>
    db.outbox.orderBy("createdAt").reverse().toArray(),
  );
}

/** Live count of reports not yet synced (pending or errored). */
export function usePendingCount(): number {
  return (
    useLiveQuery(
      () =>
        db.outbox.where("status").anyOf("pending", "error", "syncing").count(),
      [],
      0,
    ) ?? 0
  );
}
