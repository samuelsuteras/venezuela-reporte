/**
 * Tiny namespaced logger. Always logs to the console (these are operational
 * breadcrumbs for a crisis app — visible in DevTools helps users + us debug
 * "why didn't my report send?"). Keep messages short and structured.
 */
export function log(scope: string, ...args: unknown[]): void {
  if (typeof console !== "undefined") {
    console.log(`[reporteve:${scope}]`, ...args);
  }
}

export function logError(scope: string, ...args: unknown[]): void {
  if (typeof console !== "undefined") {
    console.error(`[reporteve:${scope}]`, ...args);
  }
}
