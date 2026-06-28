import "server-only";
import { getModel, TIER_1_ORDER, type ProviderKey } from "./providers";
import { breaker } from "./circuit-breaker";

/**
 * Pure round-robin with breaker-skip. Exported for testing — `order` is the
 * provider list, `isOpen` probes the breaker, `state.i` is the rotating cursor
 * (mutated in place). Returns the chosen key, or null for an empty order.
 *
 * @param order - Ordered list of provider keys to rotate over.
 * @param isOpen - Probe function; returns true if a provider's breaker is open (skip it).
 * @param state - Mutable cursor shared across calls so rotation persists.
 * @returns The next available key, or null if `order` is empty.
 */
export function rotate<T extends string>(
  order: readonly T[],
  isOpen: (k: T) => boolean,
  state: { i: number },
): T | null {
  if (order.length === 0) return null;
  for (let n = 0; n < order.length; n++) {
    const key = order[(state.i + n) % order.length];
    if (!isOpen(key)) { state.i = (state.i + n + 1) % order.length; return key; }
  }
  return order[0]; // all open — return first, breaker half-opens on the result
}

const rr = { i: 0 };

/**
 * Pick the next available provider + its model, or null if none configured.
 * Uses {@link rotate} over {@link TIER_1_ORDER} with the process-local
 * {@link breaker} to skip tripped providers.
 *
 * @returns `{ key, model }` for the chosen provider, or null if no keys are set.
 * @server-only — never call this from client components.
 */
export function pickTier1(): { key: ProviderKey; model: ReturnType<typeof getModel> } | null {
  const key = rotate(TIER_1_ORDER, (k) => breaker.isOpen(k), rr);
  if (key == null) return null;
  return { key, model: getModel(key) };
}
