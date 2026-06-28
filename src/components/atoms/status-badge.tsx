"use client";

import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/messages";
import type { SyncStatus } from "@/lib/types";

const META: Record<
  SyncStatus,
  { labelKey: MessageKey; cls: string; icon: string }
> = {
  pending: { labelKey: "status.pending", cls: "text-status-pending", icon: "⋯" },
  syncing: { labelKey: "status.syncing", cls: "text-status-pending", icon: "↑" },
  synced: { labelKey: "status.synced", cls: "text-status-synced", icon: "✓" },
  error: { labelKey: "status.error", cls: "text-warning", icon: "!" },
};

/** Sync-state pill for a queued report: icon + word (never icon alone). */
export function StatusBadge({ status }: { status: SyncStatus }) {
  const t = useT();
  const s = META[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-pill bg-surface px-2 py-0.5 text-caption ${s.cls}`}
    >
      <span aria-hidden="true">{s.icon}</span>
      {t(s.labelKey)}
    </span>
  );
}
