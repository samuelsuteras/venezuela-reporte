"use client";

import { useSyncExternalStore } from "react";

interface NetworkInformation extends EventTarget {
  saveData?: boolean;
  effectiveType?: string;
}

function connection(): NetworkInformation | undefined {
  return (navigator as Navigator & { connection?: NetworkInformation })
    .connection;
}

function subscribe(callback: () => void): () => void {
  const c = connection();
  c?.addEventListener("change", callback);
  return () => c?.removeEventListener("change", callback);
}

function isLite(): boolean {
  const c = connection();
  if (!c) return false;
  return Boolean(c.saveData) || c.effectiveType === "slow-2g" || c.effectiveType === "2g";
}

/**
 * True when the user is on a data-saver or very slow connection. Used to drop
 * image thumbnails and skip map auto-loads (DESIGN.md § Low-Bandwidth). Assumes
 * full connection during SSR.
 */
export function useSaveData(): boolean {
  return useSyncExternalStore(subscribe, isLite, () => false);
}
