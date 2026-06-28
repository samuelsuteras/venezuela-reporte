"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { Skeleton } from "boneyard-js/react";
import { registry } from "@/bones/registry";

/**
 * Returns false during SSR + first paint, true once hydrated. Uses
 * useSyncExternalStore so there's no setState-in-effect (hydration-safe and
 * lint-clean). `subscribe` never fires — the server/client snapshots differ,
 * which is exactly the mount signal we want.
 */
const noopSubscribe = () => () => {};
function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

interface BoneSkeletonProps {
  /** When true, show the skeleton; when false, show children. */
  loading: boolean;
  /** Stable capture key — matches `<Skeleton name>` for `pnpm bones:build`. */
  name: string;
  /** Real content, rendered once not loading. */
  children: ReactNode;
  /** Inline-geometry placeholder for SSR + first paint, before captured bones. */
  fixture?: ReactNode;
}

/**
 * BoneSkeleton — the app's only wrapper around boneyard's <Skeleton>.
 *
 * SSR mount-guard (do NOT remove): boneyard injects a client-only
 * `data-boneyard-content` attribute, so rendering <Skeleton> during SSR causes
 * a hydration mismatch. We render the `fixture` (or children) on the server and
 * first paint, then swap to the real boneyard skeleton after mount.
 *
 * Captured bones are resolved from the generated registry by `name`
 * (see `pnpm bones:build`). Until a capture exists, `fixture` carries the layout
 * and boneyard snapshots it live on the client.
 */
export function BoneSkeleton({
  loading,
  name,
  children,
  fixture,
}: BoneSkeletonProps) {
  const hydrated = useHydrated();

  if (!hydrated) {
    // No boneyard attributes server-side → no hydration mismatch.
    return <>{loading ? (fixture ?? null) : children}</>;
  }

  return (
    <Skeleton loading={loading} name={name} initialBones={registry[name]}>
      {children}
    </Skeleton>
  );
}
