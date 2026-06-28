/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

/**
 * Service worker entry. Serwist injects the precache manifest (`__SW_MANIFEST`)
 * at build time so the app shell loads offline. `defaultCache` adds sensible
 * runtime caching for pages, static assets, and data. Map vector tiles get
 * their own cache strategy added in Phase 2.
 */
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  // Precache the app shell + the offline fallback page.
  precacheEntries: [
    ...(self.__SW_MANIFEST ?? []),
    { url: "/offline", revision: null },
  ],
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  // When a document navigation fails offline, serve the precached /offline page.
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher: ({ request }: { request: Request }) =>
          request.mode === "navigate",
      },
    ],
  },
});

serwist.addEventListeners();
