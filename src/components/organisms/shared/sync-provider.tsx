"use client";

import { useEffect } from "react";
import { flushOutbox } from "@/lib/sync";

/**
 * Drives client-side sync: flush the outbox on mount, when the connection
 * returns, and when the app comes back to the foreground. Renders nothing;
 * mounted once in the root layout.
 *
 * ponytail: covers the realistic case (user reopens the app when signal
 * returns). True closed-app Background Sync API is a deferred enhancement —
 * see tasks/todo.md.
 */
export function SyncProvider() {
  useEffect(() => {
    void flushOutbox();
    const onOnline = () => void flushOutbox();
    const onVisible = () => {
      if (document.visibilityState === "visible") void flushOutbox();
    };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
