/**
 * Process-local in-memory circuit breaker. 3 failures within 60s opens the
 * breaker for 5min; the first call after that half-opens (probe). Per-process
 * is the right scale for serverless — no distributed coordination needed.
 * Ported from samuelsuteras/market-chat.
 */
type ProviderState = { failures: number[]; openedAt: number | null };

const FAIL_WINDOW_MS = 60_000;
const FAIL_THRESHOLD = 3;
const OPEN_DURATION_MS = 5 * 60_000;

const state = new Map<string, ProviderState>();

function load(key: string): ProviderState {
  let s = state.get(key);
  if (!s) { s = { failures: [], openedAt: null }; state.set(key, s); }
  return s;
}

export const breaker = {
  /** True while the breaker is open (skip this provider). Half-opens after OPEN_DURATION_MS. */
  isOpen(key: string): boolean {
    const s = load(key);
    if (s.openedAt == null) return false;
    if (Date.now() - s.openedAt > OPEN_DURATION_MS) { s.openedAt = null; s.failures = []; return false; }
    return true;
  },
  /** Clear all failure state for a provider after a good call. */
  recordSuccess(key: string): void { const s = load(key); s.failures = []; s.openedAt = null; },
  /** Record a failure; opens the breaker once FAIL_THRESHOLD hit inside the window. */
  recordFailure(key: string): void {
    const s = load(key);
    const now = Date.now();
    s.failures = s.failures.filter((t) => now - t < FAIL_WINDOW_MS);
    s.failures.push(now);
    if (s.failures.length >= FAIL_THRESHOLD) s.openedAt = now;
  },
};
