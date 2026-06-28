"use client";

import { useEffect, useState } from "react";
import { SYNCED_EVENT } from "@/lib/sync";
import { useT } from "@/lib/i18n/client";

/**
 * Brief confirmation when reports finish syncing. Listens for SYNCED_EVENT from
 * `flushOutbox`. `aria-live` announces it; auto-dismisses after a few seconds.
 */
export function SyncToast() {
  const t = useT();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    function onSynced(e: Event) {
      const n = (e as CustomEvent<{ count: number }>).detail?.count ?? 1;
      setCount(n);
      clearTimeout(timer);
      timer = setTimeout(() => setCount(null), 4000);
    }
    window.addEventListener(SYNCED_EVENT, onSynced);
    return () => {
      window.removeEventListener(SYNCED_EVENT, onSynced);
      clearTimeout(timer);
    };
  }, []);

  if (count === null) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-20 mx-auto flex max-w-[560px] justify-center px-4"
    >
      <span className="rounded-md bg-success px-4 py-2 text-label text-canvas shadow-lg">
        {t("sync.sent", { n: count })}
      </span>
    </div>
  );
}
