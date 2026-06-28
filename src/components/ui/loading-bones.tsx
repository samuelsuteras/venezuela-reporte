"use client";

import type { ReactNode } from "react";
import { BoneSkeleton } from "./bone-skeleton";

/**
 * Per-surface skeleton wrappers. Each owns a stable `name` (the capture key for
 * `pnpm bones:build`) and an inline-geometry `fixture` carrying the layout
 * before/without captured bones. Add one wrapper per loading surface and mount
 * it in /dev/bones so the CLI can capture it. Fixtures use static token-colored
 * blocks (no hand-rolled animate-pulse — banned per CLAUDE.md § 2).
 */

/** Skeleton for a single report card in the feed (Phase 2 surface, seeded now). */
export function ReportCardBones({
  loading,
  children,
}: {
  loading: boolean;
  children: ReactNode;
}) {
  return (
    <BoneSkeleton
      loading={loading}
      name="report-card"
      fixture={
        <div className="rounded-lg border border-hairline-soft bg-canvas p-4">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-pill bg-surface-sunk" />
            <div className="h-4 w-24 rounded-sm bg-surface-sunk" />
          </div>
          <div className="mt-3 h-5 w-3/4 rounded-sm bg-surface-sunk" />
          <div className="mt-2 h-4 w-full rounded-sm bg-surface-sunk" />
          <div className="mt-1.5 h-4 w-2/3 rounded-sm bg-surface-sunk" />
        </div>
      }
    >
      {children}
    </BoneSkeleton>
  );
}
