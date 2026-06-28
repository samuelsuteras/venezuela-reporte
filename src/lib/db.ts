import Dexie, { type EntityTable } from "dexie";
import type { OutboxReport } from "./types";

/**
 * Local-first store. Reports are written here FIRST (works fully offline) and
 * flushed to Supabase later by `flushOutbox()` (see sync.ts). IndexedDB is the
 * source of truth until a report syncs.
 *
 * Indexes: `clientUuid` (pk + idempotency key), `status` (find unsynced),
 * `createdAt` (newest-first listing).
 */
export const db = new Dexie("reporteve") as Dexie & {
  outbox: EntityTable<OutboxReport, "clientUuid">;
};

db.version(1).stores({
  outbox: "clientUuid, status, createdAt",
});
