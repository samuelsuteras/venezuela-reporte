/**
 * Namespaced logger. Logs to the console AND (client-side) forwards to
 * `/api/log` so the messages show up in **Vercel function logs** — sync runs in
 * the browser, so its errors would otherwise never reach the server.
 */

/**
 * Extract a readable message from any thrown value: Error, Supabase
 * PostgrestError/StorageError (`{message, code, hint, details}`), or a plain
 * object. Fixes the "[object Object]" we used to store on failed reports.
 */
export function describeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object") {
    const e = err as Record<string, unknown>;
    const parts = [e.message, e.code ? `(${e.code})` : "", e.hint, e.details]
      .filter((p): p is string => typeof p === "string" && p.length > 0);
    if (parts.length > 0) return parts.join(" ");
    try {
      return JSON.stringify(err);
    } catch {
      return String(err);
    }
  }
  return String(err);
}

function toSafe(arg: unknown): unknown {
  if (arg instanceof Error) return { error: arg.message };
  if (arg && typeof arg === "object") {
    try {
      JSON.stringify(arg);
      return arg;
    } catch {
      return describeError(arg);
    }
  }
  return arg;
}

function remote(level: "log" | "error", scope: string, args: unknown[]): void {
  if (typeof window === "undefined") return; // already server-side
  try {
    void fetch("/api/log", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        level,
        scope,
        args: args.map(toSafe),
        ua: typeof navigator !== "undefined" ? navigator.userAgent : "",
        online: typeof navigator !== "undefined" ? navigator.onLine : null,
      }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // never let logging throw
  }
}

export function log(scope: string, ...args: unknown[]): void {
  if (typeof console !== "undefined") console.log(`[reporteve:${scope}]`, ...args);
  remote("log", scope, args);
}

export function logError(scope: string, ...args: unknown[]): void {
  if (typeof console !== "undefined")
    console.error(`[reporteve:${scope}]`, ...args);
  remote("error", scope, args);
}
