"use client";

import { useOnline } from "@/lib/use-online";
import { usePendingCount } from "@/lib/reports";
import { useT } from "@/lib/i18n/client";

/**
 * Sticky status strip. Shows when offline and/or while reports wait in the
 * outbox, so the user always knows their reports are saved and pending — trust
 * depends on it (DESIGN.md § Low-Bandwidth). `aria-live` announces changes.
 */
export function OfflineBanner() {
  const online = useOnline();
  const pending = usePendingCount();
  const t = useT();

  if (online && pending === 0) return null;

  const message = !online
    ? pending > 0
      ? t("offline.queued", { n: pending })
      : t("offline.offline")
    : t("offline.pending", { n: pending });

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-canvas-night px-4 py-2 text-center text-label text-on-night"
    >
      {message}
    </div>
  );
}
