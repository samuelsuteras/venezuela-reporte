import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the client bundle lean for slow connections.
  poweredByHeader: false,
  // Pin the tracing root to this project — a stray lockfile in a parent dir
  // otherwise makes Next infer the wrong workspace root.
  outputFileTracingRoot: import.meta.dirname,
};

/**
 * Wrap with Serwist to generate the PWA service worker from `src/app/sw.ts`.
 * Disabled in development so a cached SW never masks fresh code; the worker is
 * built and registered for production. See PLAN.md § 7 (offline strategy).
 */
const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

export default withSerwist(nextConfig);
