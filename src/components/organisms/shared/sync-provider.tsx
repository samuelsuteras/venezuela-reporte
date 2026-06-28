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
    // Periodic safety net: retry every 30s so an unsynced report (or one
    // orphaned by a refresh) eventually goes out. flushOutbox no-ops cheaply
    // when offline / unconfigured / nothing queued.
    const interval = setInterval(() => void flushOutbox(), 30_000);
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
