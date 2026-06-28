# Report Data Extraction + Notes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract structured data (names, cédula, phone, address, links) from report/note free-text and let anyone leave notes on a report, both running through one shared extractor.

**Architecture:** Hybrid extraction — deterministic regex pulls cédula/phone/link (free, offline-capable); a rotated pool of free-tier LLMs (Groq → Gemini → OpenRouter → Cerebras, round-robin + circuit breaker, ported from `samuelsuteras/market-chat`) pulls fuzzy names/addresses via the Vercel AI SDK `generateObject`. Extraction is triggered server-side by a fire-and-forget `POST /api/extract` after a report syncs or a note is inserted; the route writes results back with the Supabase service role. Notes are anonymous, rate-limited by the existing `ip_hash` trigger pattern, read publicly through a view that hides `ip_hash`.

**Tech Stack:** Next 16.2.9 (App Router, `--webpack`), React 19.2.4, Supabase (PostgREST + RLS + PostGIS), Dexie (offline outbox), Vercel AI SDK v6 (`ai`, `@ai-sdk/groq`, `@ai-sdk/google`, `@ai-sdk/openai-compatible`), `zod` v4, `vitest` (new — no test runner exists yet), Tailwind v4.

## Global Constraints

- **No web fonts** — `system-ui` only. Don't add `next/font`.
- **Color never alone** — every report/extracted category renders color + icon + Spanish label (grayscale must stay usable).
- Use a type's `-text` token for text on canvas; `-fill` is background-only.
- **Touch targets ≥ 44px** (`min-h-11 inline-flex items-center`).
- **`"use client"` only** when a component owns state/refs/browser APIs. `extracted-chips` is presentational (no directive). `note-form`/`report-notes` are client.
- **No barrel `index.ts`** files.
- **TSDoc on every exported** function/component/hook/route handler. Comment the *why* for a11y/offline/extraction edge cases.
- **i18n:** all user-facing strings go through `src/lib/i18n/messages.ts`; add the key to BOTH `es` (source of truth) and `en` (the `Messages` type fails the build otherwise).
- **Offline-first:** never hard-require Supabase or any LLM key. `getSupabase()`/`getAdminSupabase()`/`pickTier1()` all return null when unconfigured and callers degrade gracefully (no keys ⇒ regex-only extraction; the app still works).
- **Build/dev/typecheck:** `pnpm build` and `pnpm dev` use `--webpack` (Serwist breaks Turbopack). Under disk pressure prefer `pnpm exec tsc --noEmit` (writes nothing); `rm -rf .next` for headroom if a build hits ENOSPC.
- Run unit tests with `pnpm test` (added in Task 1).

---

### Task 1: Test harness + circuit breaker

**Files:**
- Create: `src/lib/ai/circuit-breaker.ts`
- Create: `src/lib/ai/circuit-breaker.test.ts`
- Create: `vitest.config.ts`
- Create: `test/server-only-stub.ts`
- Modify: `package.json` (add `vitest`, `test` script)

**Interfaces:**
- Produces: `breaker.isOpen(key: string): boolean`, `breaker.recordSuccess(key: string): void`, `breaker.recordFailure(key: string): void`.

- [ ] **Step 1: Install vitest + add the test script**

```bash
pnpm add -D vitest
```

Edit `package.json` `"scripts"`, add:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 2: Create the `server-only` stub + vitest config**

`server-only` throws when imported outside a React Server Component; our AI modules import it. Alias it to an empty module so node-based tests can load them.

`test/server-only-stub.ts`:
```ts
// vitest aliases the "server-only" package to this no-op so server modules import cleanly in node.
export {};
```

`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: { environment: "node", include: ["src/**/*.test.ts"] },
  resolve: {
    alias: {
      "server-only": fileURLToPath(new URL("./test/server-only-stub.ts", import.meta.url)),
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
```

- [ ] **Step 3: Write the failing test**

`src/lib/ai/circuit-breaker.test.ts`:
```ts
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { breaker } from "./circuit-breaker";

describe("circuit breaker", () => {
  beforeEach(() => { breaker.recordSuccess("p"); }); // reset state for key "p"

  it("stays closed under the failure threshold", () => {
    breaker.recordFailure("p");
    breaker.recordFailure("p");
    expect(breaker.isOpen("p")).toBe(false);
  });

  it("opens after 3 failures within the window", () => {
    breaker.recordFailure("p");
    breaker.recordFailure("p");
    breaker.recordFailure("p");
    expect(breaker.isOpen("p")).toBe(true);
  });

  it("recordSuccess closes an open breaker", () => {
    breaker.recordFailure("p"); breaker.recordFailure("p"); breaker.recordFailure("p");
    breaker.recordSuccess("p");
    expect(breaker.isOpen("p")).toBe(false);
  });

  it("half-opens after the open duration elapses", () => {
    vi.useFakeTimers();
    try {
      breaker.recordFailure("p"); breaker.recordFailure("p"); breaker.recordFailure("p");
      expect(breaker.isOpen("p")).toBe(true);
      vi.advanceTimersByTime(5 * 60_000 + 1);
      expect(breaker.isOpen("p")).toBe(false); // half-open probe allowed
    } finally { vi.useRealTimers(); }
  });
});
```

- [ ] **Step 4: Run it, expect failure**

Run: `pnpm test src/lib/ai/circuit-breaker.test.ts`
Expected: FAIL — `Failed to resolve import "./circuit-breaker"`.

- [ ] **Step 5: Implement the breaker (verbatim port)**

`src/lib/ai/circuit-breaker.ts`:
```ts
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
```

- [ ] **Step 6: Run tests, expect pass**

Run: `pnpm test src/lib/ai/circuit-breaker.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml vitest.config.ts test/server-only-stub.ts src/lib/ai/circuit-breaker.ts src/lib/ai/circuit-breaker.test.ts
git commit -m "feat(ai): add vitest harness + circuit breaker (ported)"
```

---

### Task 2: LLM provider pool + router

**Files:**
- Create: `src/lib/ai/providers.ts`
- Create: `src/lib/ai/router.ts`
- Create: `src/lib/ai/router.test.ts`
- Modify: `package.json` (AI SDK deps)

**Interfaces:**
- Consumes: `breaker` (Task 1).
- Produces: `type ProviderKey = "groq" | "cerebras" | "gemini" | "openrouter"`; `getModel(k: ProviderKey): LanguageModel`; `TIER_1_ORDER: ProviderKey[]` (only providers whose key is present); `hasAnyProvider(): boolean`; `pickTier1(): { key: ProviderKey; model: LanguageModel } | null`.

- [ ] **Step 1: Install the AI SDK deps**

```bash
pnpm add ai @ai-sdk/groq @ai-sdk/google @ai-sdk/openai-compatible zod
```

- [ ] **Step 2: Write the failing router test**

`src/lib/ai/router.test.ts` (tests the pure rotation by injecting order + an `isOpen` probe, so it doesn't depend on env keys or real model construction):
```ts
import { describe, it, expect } from "vitest";
import { rotate } from "./router";

describe("rotate", () => {
  it("round-robins through all providers", () => {
    const order = ["a", "b", "c"] as const;
    const s = { i: 0 };
    const open = () => false;
    expect(rotate(order, open, s)).toBe("a");
    expect(rotate(order, open, s)).toBe("b");
    expect(rotate(order, open, s)).toBe("c");
    expect(rotate(order, open, s)).toBe("a");
  });

  it("skips providers whose breaker is open", () => {
    const order = ["a", "b", "c"] as const;
    const s = { i: 0 };
    const open = (k: string) => k === "a";
    expect(rotate(order, open, s)).toBe("b");
    expect(rotate(order, open, s)).toBe("c");
  });

  it("returns the first provider when all are open (let it half-open on result)", () => {
    const order = ["a", "b"] as const;
    const s = { i: 0 };
    expect(rotate(order, () => true, s)).toBe("a");
  });

  it("returns null for an empty order", () => {
    const s = { i: 0 };
    expect(rotate([], () => false, s)).toBeNull();
  });
});
```

- [ ] **Step 3: Run it, expect failure**

Run: `pnpm test src/lib/ai/router.test.ts`
Expected: FAIL — `Failed to resolve import "./router"`.

- [ ] **Step 4: Implement providers**

`src/lib/ai/providers.ts`:
```ts
import "server-only";
import { createGroq } from "@ai-sdk/groq";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModel } from "ai";

/** Free-tier providers we rotate over. */
export type ProviderKey = "groq" | "cerebras" | "gemini" | "openrouter";

const keys: Record<ProviderKey, string | undefined> = {
  groq: process.env.GROQ_API_KEY,
  cerebras: process.env.CEREBRAS_API_KEY,
  gemini: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  openrouter: process.env.OPENROUTER_API_KEY,
};

const lazy = <T>(fn: () => T) => { let v: T | null = null; return () => (v ??= fn()); };

const groq = lazy(() => createGroq({ apiKey: keys.groq ?? "missing" }));
const cerebras = lazy(() => createOpenAICompatible({ name: "cerebras", baseURL: "https://api.cerebras.ai/v1", apiKey: keys.cerebras ?? "missing" }));
const google = lazy(() => createGoogleGenerativeAI({ apiKey: keys.gemini ?? "missing" }));
const openrouter = lazy(() => createOpenAICompatible({ name: "openrouter", baseURL: "https://openrouter.ai/api/v1", apiKey: keys.openrouter ?? "missing" }));

const models: Record<ProviderKey, () => LanguageModel> = {
  groq: lazy(() => groq()(process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile")),
  cerebras: lazy(() => cerebras()(process.env.CEREBRAS_MODEL ?? "llama-3.3-70b") as LanguageModel),
  gemini: lazy(() => google()(process.env.GEMINI_MODEL ?? "gemini-2.5-flash")),
  openrouter: lazy(() => openrouter()(process.env.OPENROUTER_MODEL ?? "meta-llama/llama-3.3-70b-instruct:free") as LanguageModel),
};

/** Construct (lazily, cached) the LanguageModel for a provider. */
export function getModel(key: ProviderKey): LanguageModel { return models[key](); }

/** Rotation order — only providers whose API key is actually set. */
export const TIER_1_ORDER: ProviderKey[] =
  (["groq", "gemini", "openrouter", "cerebras"] as ProviderKey[]).filter((k) => Boolean(keys[k]));

/** True when at least one provider key is configured. */
export function hasAnyProvider(): boolean { return TIER_1_ORDER.length > 0; }
```

- [ ] **Step 5: Implement router (pure `rotate` + env-bound `pickTier1`)**

`src/lib/ai/router.ts`:
```ts
import "server-only";
import { getModel, TIER_1_ORDER, type ProviderKey } from "./providers";
import { breaker } from "./circuit-breaker";

/**
 * Pure round-robin with breaker-skip. Exported for testing — `order` is the
 * provider list, `isOpen` probes the breaker, `state.i` is the rotating cursor
 * (mutated in place). Returns the chosen key, or null for an empty order.
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

/** Pick the next available provider + its model, or null if none configured. */
export function pickTier1(): { key: ProviderKey; model: ReturnType<typeof getModel> } | null {
  const key = rotate(TIER_1_ORDER, (k) => breaker.isOpen(k), rr);
  if (key == null) return null;
  return { key, model: getModel(key) };
}
```

- [ ] **Step 6: Run tests, expect pass**

Run: `pnpm test src/lib/ai/router.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml src/lib/ai/providers.ts src/lib/ai/router.ts src/lib/ai/router.test.ts
git commit -m "feat(ai): provider pool + round-robin router with breaker skip"
```

---

### Task 3: Regex extraction patterns

**Files:**
- Create: `src/lib/extract/patterns.ts`
- Create: `src/lib/extract/patterns.test.ts`

**Interfaces:**
- Consumes: `Extracted`, `emptyExtracted` are defined in Task 4 — but Task 3 ships first, so `extractRegex` returns a plain object typed inline here and is re-typed against `Extracted` in Task 5. To avoid a forward dep, Task 3 exports only the three array functions; `extractRegex` is added in Task 5.
- Produces: `extractCedulas(text: string): string[]`, `extractPhones(text: string): string[]`, `extractLinks(text: string): string[]`. All return normalized, de-duplicated values.

- [ ] **Step 1: Write the failing test**

`src/lib/extract/patterns.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { extractCedulas, extractPhones, extractLinks } from "./patterns";

describe("extractCedulas", () => {
  it("normalizes dotted, spaced, and lowercase forms", () => {
    expect(extractCedulas("cédula V-12345678")).toEqual(["V-12345678"]);
    expect(extractCedulas("V12.345.678")).toEqual(["V-12345678"]);
    expect(extractCedulas("titular e-1234567")).toEqual(["E-1234567"]);
    expect(extractCedulas("RIF J-31000000")).toEqual(["J-31000000"]);
  });
  it("dedupes repeats", () => {
    expect(extractCedulas("V-12345678 y de nuevo V12.345.678")).toEqual(["V-12345678"]);
  });
  it("returns [] when none", () => { expect(extractCedulas("sin id")).toEqual([]); });
});

describe("extractPhones", () => {
  it("normalizes VE mobile + landline + intl to +58", () => {
    expect(extractPhones("llama 0414-1234567")).toEqual(["+584141234567"]);
    expect(extractPhones("+58 412 1234567")).toEqual(["+584121234567"]);
    expect(extractPhones("04241234567")).toEqual(["+584241234567"]);
    expect(extractPhones("fijo 0212-5551234")).toEqual(["+582125551234"]);
  });
  it("returns [] for non-VE / junk numbers", () => {
    expect(extractPhones("123")).toEqual([]);
  });
});

describe("extractLinks", () => {
  it("strips trailing punctuation and adds https", () => {
    expect(extractLinks("ver https://wa.me/58414.")).toEqual(["https://wa.me/58414"]);
    expect(extractLinks("www.cruzroja.org.ve, ayuda")).toEqual(["https://www.cruzroja.org.ve/"]);
  });
  it("drops invalid and returns [] when none", () => {
    expect(extractLinks("no hay enlace")).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it, expect failure**

Run: `pnpm test src/lib/extract/patterns.test.ts`
Expected: FAIL — `Failed to resolve import "./patterns"`.

- [ ] **Step 3: Implement patterns**

`src/lib/extract/patterns.ts`:
```ts
/**
 * Deterministic, isomorphic (browser + node) extractors for the rigidly-formatted
 * entities. Run for free with no LLM and even offline; the fuzzy bits
 * (names/addresses) are the LLM's job (see llm.ts). All return normalized,
 * de-duplicated arrays.
 */

// Cédula / RIF: optional prefix V/E/J/P/G, optional separators, 6–9 digits.
const CEDULA_RE = /\b([VEJPGvejpg])[-\s.]?(\d{1,2}(?:[.\s]?\d{3}){1,2}|\d{6,9})\b/g;

/** Extract Venezuelan cédula/RIF numbers, normalized to `PREFIX-DIGITS`. */
export function extractCedulas(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(CEDULA_RE)) {
    const digits = m[2].replace(/[.\s]/g, "");
    if (digits.length >= 6 && digits.length <= 9) out.add(`${m[1].toUpperCase()}-${digits}`);
  }
  return [...out];
}

// VE phone: optional +58, mobile (0)4{12,14,16,24,26} or landline (0)2xx, then 3+4 digits.
const PHONE_RE = /(?:\+?58[\s-]?)?\(?0?(?:4(?:12|14|16|24|26)|2\d{2})\)?[\s-]?\d{3}[\s-]?\d{4}/g;

/** Extract VE phone numbers, normalized to `+58XXXXXXXXXX`. */
export function extractPhones(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(PHONE_RE)) {
    let n = m[0].replace(/\D/g, "");
    if (n.startsWith("58")) n = n.slice(2);
    if (n.startsWith("0")) n = n.slice(1);
    if (n.length === 10) out.add(`+58${n}`);
  }
  return [...out];
}

const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>"')]+/gi;

/** Extract absolute URLs (bare `www.` gets `https://`); invalid URLs dropped. */
export function extractLinks(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(URL_RE)) {
    let raw = m[0].replace(/[.,;:!?)]+$/, "");
    if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
    try { out.add(new URL(raw).toString()); } catch { /* skip invalid */ }
  }
  return [...out];
}
```

- [ ] **Step 4: Run tests, expect pass**

Run: `pnpm test src/lib/extract/patterns.test.ts`
Expected: PASS (all). If `extractCedulas("V12.345.678")` fails, confirm the regex alternation order (dotted form before bare `\d{6,9}`) — the test above is the contract.

- [ ] **Step 5: Commit**

```bash
git add src/lib/extract/patterns.ts src/lib/extract/patterns.test.ts
git commit -m "feat(extract): regex extractors for cedula/phone/link (VE)"
```

---

### Task 4: Extracted type + normalizer

**Files:**
- Create: `src/lib/extract/types.ts`
- Create: `src/lib/extract/types.test.ts`

**Interfaces:**
- Produces: `interface Extracted { cedulas: string[]; phones: string[]; links: string[]; names: string[]; addresses: string[] }`; `emptyExtracted(): Extracted`; `normalizeStrings(arr: unknown, cap?: number): string[]`.

- [ ] **Step 1: Write the failing test**

`src/lib/extract/types.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { normalizeStrings, emptyExtracted } from "./types";

describe("normalizeStrings", () => {
  it("trims, drops empties/non-strings, dedupes case-insensitively", () => {
    expect(normalizeStrings([" Ana ", "ana", "", 5, "Luis", null])).toEqual(["Ana", "Luis"]);
  });
  it("returns [] for non-arrays", () => { expect(normalizeStrings(undefined)).toEqual([]); });
  it("caps the array length", () => {
    expect(normalizeStrings(["a", "b", "c"], 2)).toEqual(["a", "b"]);
  });
});

describe("emptyExtracted", () => {
  it("is all-empty arrays", () => {
    expect(emptyExtracted()).toEqual({ cedulas: [], phones: [], links: [], names: [], addresses: [] });
  });
});
```

- [ ] **Step 2: Run it, expect failure**

Run: `pnpm test src/lib/extract/types.test.ts`
Expected: FAIL — `Failed to resolve import "./types"`.

- [ ] **Step 3: Implement**

`src/lib/extract/types.ts`:
```ts
/** Structured data pulled from a report/note's free text. */
export interface Extracted {
  cedulas: string[];
  phones: string[];
  links: string[];
  names: string[];
  addresses: string[];
}

/** A fresh all-empty Extracted. */
export function emptyExtracted(): Extracted {
  return { cedulas: [], phones: [], links: [], names: [], addresses: [] };
}

/**
 * Coerce a possibly-sloppy LLM array into clean strings: trim, drop empties and
 * non-strings, dedupe case-insensitively, cap length. Free models emit dupes,
 * whitespace, and wrong types — validate loose, normalize here (market-chat lesson).
 */
export function normalizeStrings(arr: unknown, cap = 20): string[] {
  if (!Array.isArray(arr)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of arr) {
    if (typeof v !== "string") continue;
    const s = v.trim();
    if (!s) continue;
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
    if (out.length >= cap) break;
  }
  return out;
}
```

- [ ] **Step 4: Run tests, expect pass**

Run: `pnpm test src/lib/extract/types.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/extract/types.ts src/lib/extract/types.test.ts
git commit -m "feat(extract): Extracted type + permissive string normalizer"
```

---

### Task 5: Fuzzy LLM extract + combined extractAll

**Files:**
- Create: `src/lib/extract/llm.ts`
- Create: `src/lib/extract/extract.ts`
- Create: `src/lib/extract/extract.test.ts`
- Modify: `src/lib/extract/patterns.ts` (add `extractRegex`)

**Interfaces:**
- Consumes: `pickTier1` (Task 2), `breaker` (Task 1), `normalizeStrings`/`Extracted`/`emptyExtracted` (Task 4), `extractCedulas`/`extractPhones`/`extractLinks` (Task 3).
- Produces: `extractFuzzy(text: string): Promise<{ names: string[]; addresses: string[] }>`; `extractRegex(text: string): Extracted` (browser-safe, no LLM import); `extractAll(text: string): Promise<Extracted>`.

- [ ] **Step 1: Add `extractRegex` to patterns.ts**

Append to `src/lib/extract/patterns.ts`:
```ts
import { emptyExtracted, type Extracted } from "./types";

/** Regex-only extraction (browser-safe — no LLM). cédula/phone/link only. */
export function extractRegex(text: string): Extracted {
  return { ...emptyExtracted(), cedulas: extractCedulas(text), phones: extractPhones(text), links: extractLinks(text) };
}
```

- [ ] **Step 2: Write the failing test (LLM mocked)**

`src/lib/extract/extract.test.ts`:
```ts
import { describe, it, expect, vi } from "vitest";

vi.mock("./llm", () => ({
  extractFuzzy: vi.fn(async () => ({ names: ["Ana Pérez"], addresses: ["Av. Bolívar"] })),
}));

import { extractAll } from "./extract";

describe("extractAll", () => {
  it("unions regex entities with LLM names/addresses", async () => {
    const r = await extractAll("Ana Pérez, V-12345678, 0414-1234567, https://wa.me/1 en Av. Bolívar");
    expect(r.cedulas).toEqual(["V-12345678"]);
    expect(r.phones).toEqual(["+584141234567"]);
    expect(r.links).toEqual(["https://wa.me/1"]);
    expect(r.names).toEqual(["Ana Pérez"]);
    expect(r.addresses).toEqual(["Av. Bolívar"]);
  });

  it("falls back to regex-only when the LLM throws", async () => {
    const llm = await import("./llm");
    vi.mocked(llm.extractFuzzy).mockRejectedValueOnce(new Error("all providers down"));
    const r = await extractAll("V-12345678");
    expect(r.cedulas).toEqual(["V-12345678"]);
    expect(r.names).toEqual([]);
  });
});
```

- [ ] **Step 3: Run it, expect failure**

Run: `pnpm test src/lib/extract/extract.test.ts`
Expected: FAIL — `Failed to resolve import "./extract"`.

- [ ] **Step 4: Implement llm.ts**

`src/lib/extract/llm.ts`:
```ts
import "server-only";
import { generateObject } from "ai";
import { z } from "zod";
import { pickTier1 } from "@/lib/ai/router";
import { breaker } from "@/lib/ai/circuit-breaker";
import { normalizeStrings } from "./types";

// Permissive schema — validate loose, normalize after (free models are sloppy).
const fuzzySchema = z.object({
  names: z.array(z.string()).optional(),
  addresses: z.array(z.string()).optional(),
});

const prompt = (text: string) =>
  `Eres un extractor de datos para reportes de emergencia en Venezuela. ` +
  `Del siguiente texto, extrae SOLO: (1) nombres de personas mencionadas, ` +
  `(2) direcciones o ubicaciones (calles, sectores, barrios, puntos de referencia). ` +
  `No inventes datos que no estén en el texto. No incluyas cédulas ni teléfonos. ` +
  `Responde en JSON con las claves "names" y "addresses".\n\nTexto:\n"""${text}"""`;

/**
 * Pull person names + addresses via the rotated provider pool. Tries up to two
 * providers, recording breaker success/failure. Returns empty arrays when no
 * provider is configured or every attempt fails — the caller keeps regex results.
 */
export async function extractFuzzy(text: string): Promise<{ names: string[]; addresses: string[] }> {
  if (!text.trim()) return { names: [], addresses: [] };
  for (let attempt = 0; attempt < 2; attempt++) {
    const pick = pickTier1();
    if (!pick) break;
    try {
      const { object } = await generateObject({ model: pick.model, schema: fuzzySchema, prompt: prompt(text) });
      breaker.recordSuccess(pick.key);
      return { names: normalizeStrings(object.names), addresses: normalizeStrings(object.addresses) };
    } catch {
      breaker.recordFailure(pick.key);
    }
  }
  return { names: [], addresses: [] };
}
```

- [ ] **Step 5: Implement extract.ts**

`src/lib/extract/extract.ts`:
```ts
import { extractRegex } from "./patterns";
import { extractFuzzy } from "./llm";
import type { Extracted } from "./types";

/**
 * Full extraction: deterministic regex (cédula/phone/link) unioned with the
 * LLM's fuzzy names/addresses. Server-only (imports the AI pool). Degrades to
 * regex-only if the LLM pool is unconfigured or fails.
 */
export async function extractAll(text: string): Promise<Extracted> {
  const base = extractRegex(text);
  try {
    const fuzzy = await extractFuzzy(text);
    base.names = fuzzy.names;
    base.addresses = fuzzy.addresses;
  } catch {
    /* regex-only fallback */
  }
  return base;
}
```

- [ ] **Step 6: Run tests, expect pass**

Run: `pnpm test src/lib/extract/`
Expected: PASS (patterns + types + extract suites).

- [ ] **Step 7: Commit**

```bash
git add src/lib/extract/llm.ts src/lib/extract/extract.ts src/lib/extract/extract.test.ts src/lib/extract/patterns.ts
git commit -m "feat(extract): LLM fuzzy names/addresses + hybrid extractAll"
```

---

### Task 6: Migration 0005 — extraction columns + notes

**Files:**
- Create: `supabase/migrations/0005_extraction_and_notes.sql`

**Interfaces:**
- Produces (DB surface for later tasks): `reports.extracted jsonb`, `reports.extracted_at timestamptz`; table `public.report_notes(id, client_uuid, report_id, body, extracted, extracted_at, ip_hash, status, created_at)`; view `public.report_notes_public(id, report_id, body, extracted, created_at)`; `reports_public` and `reports_moderation` views gain `extracted`.

- [ ] **Step 1: Write the migration**

`supabase/migrations/0005_extraction_and_notes.sql`:
```sql
-- Reporte VE — structured extraction on reports/notes + anonymous notes.
-- Apply AFTER 0004. Extraction results land in `extracted` jsonb (written by the
-- /api/extract route via service role). Notes are anonymous, rate-limited by the
-- same ip_hash pattern as reports (0002), read publicly through a view that hides ip_hash.

-- ── Extraction columns on reports ────────────────────────────────────
alter table public.reports
  add column if not exists extracted    jsonb,
  add column if not exists extracted_at timestamptz;

-- ── Notes ────────────────────────────────────────────────────────────
do $$ begin
  create type note_status as enum ('visible','hidden');
exception when duplicate_object then null; end $$;

create table if not exists public.report_notes (
  id           uuid primary key default gen_random_uuid(),
  client_uuid  uuid not null unique,                 -- idempotency + extract-ping target
  report_id    uuid not null references public.reports(id) on delete cascade,
  body         text not null check (char_length(body) between 1 and 1000),
  extracted    jsonb,
  extracted_at timestamptz,
  ip_hash      text,                                 -- set by trigger, never exposed
  status       note_status not null default 'visible',
  created_at   timestamptz not null default now()
);
create index if not exists report_notes_report_idx on public.report_notes (report_id, created_at desc);

alter table public.report_notes enable row level security;

-- Rate limit: salted ip hash, cap per ip and per report. Mirrors enforce_report_rate_limit (0002).
create or replace function public.enforce_note_rate_limit()
returns trigger as $$
declare v_ip text; v_ip_count int; v_report_count int;
begin
  v_ip := split_part(
    coalesce(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ''), ',', 1);
  new.ip_hash := encode(
    digest(coalesce(nullif(v_ip, ''), new.client_uuid::text) || ':reporteve', 'sha256'), 'hex');

  select count(*) into v_ip_count from public.report_notes
    where ip_hash = new.ip_hash and created_at > now() - interval '10 minutes';
  if v_ip_count >= 10 then
    raise exception 'rate_limit_exceeded'
      using errcode = 'check_violation', hint = 'Demasiadas notas. Espera unos minutos.';
  end if;

  select count(*) into v_report_count from public.report_notes
    where report_id = new.report_id and ip_hash = new.ip_hash
      and created_at > now() - interval '1 minute';
  if v_report_count >= 3 then
    raise exception 'rate_limit_exceeded'
      using errcode = 'check_violation', hint = 'Espera un momento antes de otra nota.';
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists report_notes_rate_limit on public.report_notes;
create trigger report_notes_rate_limit before insert on public.report_notes
  for each row execute function public.enforce_note_rate_limit();

-- Anyone may post a note, but only as 'visible' (can't self-insert hidden).
drop policy if exists notes_insert_anon on public.report_notes;
create policy notes_insert_anon on public.report_notes
  for insert to anon, authenticated with check (status = 'visible');

-- Moderators can read all notes (incl. ip_hash/hidden) and hide/restore them.
drop policy if exists notes_select_mod on public.report_notes;
create policy notes_select_mod on public.report_notes
  for select to authenticated using (public.is_moderator());

drop policy if exists notes_update_mod on public.report_notes;
create policy notes_update_mod on public.report_notes
  for update to authenticated
  using (public.is_moderator()) with check (public.is_moderator());

-- Public read surface — visible notes only, ip_hash never exposed.
create or replace view public.report_notes_public as
  select id, report_id, body, extracted, created_at
  from public.report_notes
  where status = 'visible';
grant select on public.report_notes_public to anon, authenticated;

-- ── Recreate views to expose `extracted` (append-only; CREATE OR REPLACE can't reorder) ──
create or replace view public.reports_public as
  select
    id, type, title, description,
    st_y(location::geometry) as lat,
    st_x(location::geometry) as lng,
    address_text, status, image_paths, created_at,
    contact_phone, extracted
  from public.reports
  where status in ('published', 'resolved');
grant select on public.reports_public to anon, authenticated;

create or replace view public.reports_moderation
with (security_invoker = true) as
  select
    r.id, r.client_uuid, r.type, r.title, r.description,
    st_y(r.location::geometry) as lat,
    st_x(r.location::geometry) as lng,
    r.address_text, r.status, r.contact_phone, r.image_paths,
    r.duplicate_of, r.created_at, r.extracted,
    (select count(distinct f.client_uuid)
       from public.report_flags f where f.report_id = r.id) as flag_count
  from public.reports r;
grant select on public.reports_moderation to authenticated;
```

- [ ] **Step 2: Apply + verify against the database**

If the Supabase CLI is linked (`supabase/` exists):
```bash
supabase db push
```
If not linked, apply via the SQL editor / psql against the project, then verify:
```bash
# verify columns + table exist (psql to your Supabase connection string)
psql "$SUPABASE_DB_URL" -c "\d public.report_notes"
psql "$SUPABASE_DB_URL" -c "select extracted, extracted_at from public.reports limit 1;"
psql "$SUPABASE_DB_URL" -c "select * from public.report_notes_public limit 1;"
```
Expected: `report_notes` lists `client_uuid`, `extracted`, `ip_hash`, `status`; the two selects run without "column does not exist". (If you have no live DB in this environment, mark this step verified-on-deploy and continue — later tasks degrade gracefully when Supabase is unconfigured.)

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0005_extraction_and_notes.sql
git commit -m "db: 0005 — extraction columns + anonymous notes (RLS, rate limit, views)"
```

---

### Task 7: Server admin Supabase client

**Files:**
- Create: `src/lib/supabase-admin.ts`

**Interfaces:**
- Produces: `getAdminSupabase(): SupabaseClient | null` (service-role, server-only).

- [ ] **Step 1: Implement (no separate unit test — exercised by Task 8's route test)**

`src/lib/supabase-admin.ts`:
```ts
import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client for server-side writes that bypass RLS
 * (the /api/extract route writes `extracted` back to reports/notes). Returns
 * null when the URL or service key is missing, so the route no-ops instead of
 * crashing in an unconfigured environment. NEVER import this in client code —
 * the service key must never reach the browser.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function getAdminSupabase(): SupabaseClient | null {
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
```

- [ ] **Step 2: Typecheck + commit**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.
```bash
git add src/lib/supabase-admin.ts
git commit -m "feat: server-only service-role supabase client"
```

---

### Task 8: `/api/extract` route handler

**Files:**
- Create: `src/app/api/extract/route.ts`
- Create: `src/app/api/extract/route.test.ts`

**Interfaces:**
- Consumes: `getAdminSupabase` (Task 7), `extractAll` (Task 5).
- Produces: `POST /api/extract` accepting `{ kind: "report" | "note", clientUuid: string }` (+ `?force=1`). Looks the row up by `client_uuid`, runs `extractAll` on its text column, writes `extracted` + `extracted_at`. Idempotent. IP rate-limited. No-op (204) when unconfigured.

- [ ] **Step 1: Write the failing test (admin client + extractAll mocked)**

`src/app/api/extract/route.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const update = vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) }));
const single = vi.fn();
const from = vi.fn(() => ({
  select: () => ({ eq: () => ({ maybeSingle: single }) }),
  update,
}));
vi.mock("@/lib/supabase-admin", () => ({ getAdminSupabase: () => ({ from }) }));
vi.mock("@/lib/extract/extract", () => ({
  extractAll: vi.fn(async () => ({ cedulas: ["V-1"], phones: [], links: [], names: [], addresses: [] })),
}));

import { POST } from "./route";

function req(body: unknown, url = "http://x/api/extract") {
  return new Request(url, { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": "1.2.3.4" }, body: JSON.stringify(body) }) as never;
}

describe("POST /api/extract", () => {
  beforeEach(() => { single.mockReset(); update.mockClear(); });

  it("400 on bad body", async () => {
    const res = await POST(req({ kind: "x" }));
    expect(res.status).toBe(400);
  });

  it("extracts and writes back", async () => {
    single.mockResolvedValueOnce({ data: { description: "Ana V-1", extracted_at: null }, error: null });
    const res = await POST(req({ kind: "report", clientUuid: "u1" }));
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledOnce();
  });

  it("is idempotent (204, no write) when already extracted and not forced", async () => {
    single.mockResolvedValueOnce({ data: { description: "x", extracted_at: "2026-01-01" }, error: null });
    const res = await POST(req({ kind: "report", clientUuid: "u1" }));
    expect(res.status).toBe(204);
    expect(update).not.toHaveBeenCalled();
  });

  it("404 when the row is missing", async () => {
    single.mockResolvedValueOnce({ data: null, error: null });
    const res = await POST(req({ kind: "note", clientUuid: "nope" }));
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run it, expect failure**

Run: `pnpm test src/app/api/extract/route.test.ts`
Expected: FAIL — `Failed to resolve import "./route"`.

- [ ] **Step 3: Implement the route**

`src/app/api/extract/route.ts`:
```ts
import { getAdminSupabase } from "@/lib/supabase-admin";
import { extractAll } from "@/lib/extract/extract";

export const runtime = "nodejs";

type Body = { kind?: "report" | "note"; clientUuid?: string };

// ponytail: process-local IP rate limit; per cold start is fine at our scale.
const hits = new Map<string, number[]>();
function rateLimited(ip: string, max = 20, windowMs = 60_000): boolean {
  const now = Date.now();
  const a = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
  a.push(now);
  hits.set(ip, a);
  return a.length > max;
}

/**
 * Extract structured data from a report/note and persist it. Triggered
 * fire-and-forget after a report syncs or a note is posted (the client can't
 * call the LLM — keys are server-only). Idempotent: skips rows already
 * extracted unless `?force=1`. No-op when Supabase isn't configured.
 */
export async function POST(req: Request): Promise<Response> {
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.clientUuid || (body.kind !== "report" && body.kind !== "note")) {
    return new Response("bad request", { status: 400 });
  }
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (rateLimited(ip)) return new Response("rate limited", { status: 429 });

  const admin = getAdminSupabase();
  if (!admin) return new Response(null, { status: 204 }); // unconfigured — nothing to do

  const table = body.kind === "report" ? "reports" : "report_notes";
  const textCol = body.kind === "report" ? "description" : "body";
  const force = new URL(req.url).searchParams.get("force") === "1";

  const { data, error } = await admin
    .from(table)
    .select(`${textCol},extracted_at`)
    .eq("client_uuid", body.clientUuid)
    .maybeSingle();
  if (error || !data) return new Response("not found", { status: 404 });

  const row = data as Record<string, unknown>;
  if (row.extracted_at && !force) return new Response(null, { status: 204 });

  const extracted = await extractAll((row[textCol] as string | null) ?? "");
  const { error: upErr } = await admin
    .from(table)
    .update({ extracted, extracted_at: new Date().toISOString() })
    .eq("client_uuid", body.clientUuid);
  if (upErr) return new Response("write failed", { status: 500 });

  return Response.json({ ok: true, extracted });
}
```

- [ ] **Step 4: Run tests, expect pass**

Run: `pnpm test src/app/api/extract/route.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/extract/route.ts src/app/api/extract/route.test.ts
git commit -m "feat(api): /api/extract — server-side hybrid extraction write-back"
```

---

### Task 9: Surface `extracted` in feed + cédula policy

**Files:**
- Modify: `src/lib/feed.ts`
- Create: `src/lib/feed.test.ts`

**Interfaces:**
- Consumes: `Extracted` (Task 4).
- Produces: `PublicReport.extracted: Extracted | null`; `maskCedula(c: string): string`; `applyCedulaPolicy(e: Extracted): Extracted`. `fetchReportById`/`fetchReports` now return `extracted` (cédula policy applied).

- [ ] **Step 1: Write the failing test**

`src/lib/feed.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { maskCedula } from "./feed";

describe("maskCedula", () => {
  it("keeps prefix + first 3 digits, masks the rest", () => {
    expect(maskCedula("V-12345678")).toBe("V-123#####");
  });
  it("passes through values it can't parse", () => {
    expect(maskCedula("weird")).toBe("weird");
  });
});
```

- [ ] **Step 2: Run it, expect failure**

Run: `pnpm test src/lib/feed.test.ts`
Expected: FAIL — `maskCedula is not exported` / import error.

- [ ] **Step 3: Edit feed.ts**

In `src/lib/feed.ts`, add the import and the policy helpers, and extend the type/row/columns/mapper.

Add near the top imports:
```ts
import type { Extracted } from "./extract/types";
```

Add to `interface PublicReport` (after `contactPhone`):
```ts
  extracted: Extracted | null;
```

Add to `interface PublicRow` (after `contact_phone`):
```ts
  extracted: Extracted | null;
```

Change `COLUMNS`:
```ts
const COLUMNS =
  "id,type,title,description,lat,lng,address_text,status,image_paths,created_at,contact_phone,extracted";
```

Add the cédula policy helpers above `toReport`:
```ts
// Full cédula public from day one. Flip NEXT_PUBLIC_EXTRACT_CEDULA_FULL=false to mask.
const CEDULA_FULL = process.env.NEXT_PUBLIC_EXTRACT_CEDULA_FULL !== "false";

/** Mask all but the prefix + first 3 digits of a normalized cédula (`V-123#####`). */
export function maskCedula(c: string): string {
  const m = /^([VEJPG])-(\d{3})(\d+)$/.exec(c);
  if (!m) return c;
  return `${m[1]}-${m[2]}${"#".repeat(m[3].length)}`;
}

/** Apply the public cédula visibility policy to an extraction result. */
export function applyCedulaPolicy(e: Extracted): Extracted {
  if (CEDULA_FULL) return e;
  return { ...e, cedulas: e.cedulas.map(maskCedula) };
}
```

In `toReport`, add the `extracted` field (with policy):
```ts
    contactPhone: r.contact_phone,
    extracted: r.extracted ? applyCedulaPolicy(r.extracted) : null,
```

- [ ] **Step 4: Run tests, expect pass**

Run: `pnpm test src/lib/feed.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Typecheck + commit**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.
```bash
git add src/lib/feed.ts src/lib/feed.test.ts
git commit -m "feat(feed): expose extracted on public reports + cedula policy"
```

---

### Task 10: Fire extraction after report sync

**Files:**
- Modify: `src/lib/sync.ts`

**Interfaces:**
- Consumes: `POST /api/extract` (Task 8).
- Produces: side-effect only — after a report's first successful sync, a fire-and-forget `POST /api/extract { kind:"report", clientUuid }`.

- [ ] **Step 1: Add the ping helper + call it on success**

In `src/lib/sync.ts`, add this helper below the `SYNCED_EVENT` constant:
```ts
/**
 * Ask the server to extract structured data for a freshly-synced report.
 * Fire-and-forget: the client can't call the LLM (keys are server-only), and
 * extraction is best-effort — a failure never affects the report. The route is
 * idempotent, so calling once per first-sync is enough.
 */
function pingExtract(clientUuid: string): void {
  if (typeof window === "undefined") return;
  void fetch("/api/extract", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ kind: "report", clientUuid }),
  }).catch(() => { /* best-effort */ });
}
```

In `syncOne`, immediately after the local status is set to `"synced"` (right after the `db.outbox.update(..., { status: "synced", ... })` call, before `return true`):
```ts
    pingExtract(report.clientUuid);
```

- [ ] **Step 2: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/sync.ts
git commit -m "feat(sync): trigger server extraction after a report syncs"
```

---

### Task 11: Notes data layer

**Files:**
- Create: `src/lib/notes.ts`

**Interfaces:**
- Consumes: `getSupabase` (existing), `POST /api/extract` (Task 8), `report_notes_public` view + `report_notes` table (Task 6), `Extracted` (Task 4).
- Produces: `interface PublicNote { id: string; body: string; extracted: Extracted | null; createdAt: string }`; `addNote(reportId: string, body: string): Promise<void>`; `useNotes(reportId: string): PublicNote[] | undefined`.

- [ ] **Step 1: Implement notes.ts**

`src/lib/notes.ts`:
```ts
"use client";
import { useEffect, useState } from "react";
import { getSupabase } from "./supabase";
import { logError } from "./log";
import type { Extracted } from "./extract/types";

/** A publicly-visible note (status='visible'), from the report_notes_public view. */
export interface PublicNote {
  id: string;
  body: string;
  extracted: Extracted | null;
  createdAt: string;
}

interface NoteRow { id: string; body: string; extracted: Extracted | null; created_at: string }

function toNote(r: NoteRow): PublicNote {
  return { id: r.id, body: r.body, extracted: r.extracted, createdAt: r.created_at };
}

/**
 * Post an anonymous note on a report, then fire-and-forget server extraction.
 * Generates a client_uuid for idempotency + as the extract-ping target. Throws
 * on insert failure (caller shows an error); extraction failure is silent.
 */
export async function addNote(reportId: string, body: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("offline");
  const clientUuid = crypto.randomUUID();
  const { error } = await supabase
    .from("report_notes")
    .insert({ client_uuid: clientUuid, report_id: reportId, body });
  if (error) throw error;
  void fetch("/api/extract", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ kind: "note", clientUuid }),
  }).catch(() => { /* best-effort */ });
}

/** Live list of visible notes for a report (initial fetch + Realtime refetch). */
export function useNotes(reportId: string): PublicNote[] | undefined {
  const [notes, setNotes] = useState<PublicNote[] | undefined>(undefined);
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) { setNotes([]); return; }
    let active = true;
    const load = () =>
      supabase
        .from("report_notes_public")
        .select("id,body,extracted,created_at")
        .eq("report_id", reportId)
        .order("created_at", { ascending: true })
        .then(({ data, error }) => {
          if (error) { logError("notes", "load failed", error.message); return; }
          if (active) setNotes(((data ?? []) as unknown as NoteRow[]).map(toNote));
        });
    void load();
    const channel = supabase
      .channel(`notes-${reportId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "report_notes", filter: `report_id=eq.${reportId}` }, () => void load())
      .subscribe();
    return () => { active = false; void supabase.removeChannel(channel); };
  }, [reportId]);
  return notes;
}
```

- [ ] **Step 2: Typecheck + commit**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.
```bash
git add src/lib/notes.ts
git commit -m "feat(notes): anonymous note insert + live read hook"
```

---

### Task 12: i18n keys for extraction + notes

**Files:**
- Modify: `src/lib/i18n/messages.ts`

**Interfaces:**
- Produces: message keys consumed by Tasks 13–15. Keys: `detail.extracted`, `extracted.names`, `extracted.cedula`, `extracted.phones`, `extracted.addresses`, `extracted.links`, `notes.heading`, `notes.placeholder`, `notes.submit`, `notes.empty`, `notes.posting`, `notes.posted`, `notes.error`, `notes.tooLong`.

- [ ] **Step 1: Add keys to the `es` block**

In `src/lib/i18n/messages.ts`, inside the `es` object (after the `detail.*` group), add:
```ts
  "detail.extracted": "Datos detectados",
  "extracted.names": "Nombres",
  "extracted.cedula": "Cédula",
  "extracted.phones": "Teléfonos",
  "extracted.addresses": "Direcciones",
  "extracted.links": "Enlaces",

  "notes.heading": "Notas",
  "notes.placeholder": "Añade información: enlaces, contactos, detalles…",
  "notes.submit": "Publicar nota",
  "notes.empty": "Sin notas todavía.",
  "notes.posting": "Publicando…",
  "notes.posted": "Nota publicada.",
  "notes.error": "No se pudo publicar. Intenta de nuevo.",
  "notes.tooLong": "Máximo 1000 caracteres.",
```

- [ ] **Step 2: Add the mirrored keys to the `en` block**

In the `en` object (same relative spot), add:
```ts
  "detail.extracted": "Detected data",
  "extracted.names": "Names",
  "extracted.cedula": "ID (cédula)",
  "extracted.phones": "Phones",
  "extracted.addresses": "Addresses",
  "extracted.links": "Links",

  "notes.heading": "Notes",
  "notes.placeholder": "Add info: links, contacts, details…",
  "notes.submit": "Post note",
  "notes.empty": "No notes yet.",
  "notes.posting": "Posting…",
  "notes.posted": "Note posted.",
  "notes.error": "Couldn't post. Try again.",
  "notes.tooLong": "Max 1000 characters.",
```

- [ ] **Step 3: Typecheck (the `Messages` type enforces es/en parity) + commit**

Run: `pnpm exec tsc --noEmit`
Expected: no errors (if it complains about a missing key in `en`, you missed a mirror — add it).
```bash
git add src/lib/i18n/messages.ts
git commit -m "i18n: extraction + notes strings (es/en)"
```

---

### Task 13: `extracted-chips` molecule

**Files:**
- Create: `src/components/molecules/extracted-chips.tsx`
- Create: `src/components/molecules/extracted-chips.test.tsx`

**Interfaces:**
- Consumes: `Extracted` (Task 4), `CallButton` (existing), i18n keys (Task 12).
- Produces: `<ExtractedChips extracted={Extracted | null} />` — presentational (no `"use client"`); renders nothing when all categories are empty.

- [ ] **Step 1: Write the failing render test**

`src/components/molecules/extracted-chips.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ExtractedChips } from "./extracted-chips";

describe("ExtractedChips", () => {
  it("renders nothing when empty", () => {
    const html = renderToStaticMarkup(<ExtractedChips extracted={null} />);
    expect(html).toBe("");
  });
  it("renders cédula + link values with labels", () => {
    const html = renderToStaticMarkup(
      <ExtractedChips extracted={{ cedulas: ["V-12345678"], phones: [], links: ["https://wa.me/1"], names: ["Ana"], addresses: [] }} />,
    );
    expect(html).toContain("V-12345678");
    expect(html).toContain("Ana");
    expect(html).toContain("wa.me");
  });
});
```

This test needs jsx in a `.tsx` test; vitest handles `.tsx` via esbuild. Add `"jsx": "react-jsx"` is already set in `tsconfig.json` (Next default) — no config change needed. If vitest can't find React automatically, the `import` of `react-dom/server` plus the automatic runtime covers it.

- [ ] **Step 2: Run it, expect failure**

Run: `pnpm test src/components/molecules/extracted-chips.test.tsx`
Expected: FAIL — `Failed to resolve import "./extracted-chips"`.

- [ ] **Step 3: Implement the component**

`src/components/molecules/extracted-chips.tsx`:
```tsx
import { CallButton } from "@/components/molecules/call-button";
import { t as translate } from "@/lib/i18n"; // server-safe translator (see note)
import type { Extracted } from "@/lib/extract/types";
import type { MessageKey } from "@/lib/i18n/messages";

/**
 * Read-only display of structured data pulled from a report/note. Presentational
 * server component (no state). Renders nothing when there's nothing to show.
 * a11y: each category carries an icon + Spanish label (never color alone);
 * links open externally with rel="noopener nofollow"; phones reuse CallButton.
 */
export function ExtractedChips({ extracted }: { extracted: Extracted | null }) {
  if (!extracted) return null;
  const { cedulas, phones, links, names, addresses } = extracted;
  if (!cedulas.length && !phones.length && !links.length && !names.length && !addresses.length) return null;

  return (
    <section className="mt-4 rounded-lg border border-hairline-soft bg-surface p-3" aria-label={translate("detail.extracted")}>
      <h2 className="text-label text-ink-soft">{translate("detail.extracted")}</h2>
      <Row icon="👤" labelKey="extracted.names" values={names} />
      <Row icon="🪪" labelKey="extracted.cedula" values={cedulas} />
      <Row icon="📍" labelKey="extracted.addresses" values={addresses} />
      {phones.length > 0 && (
        <div className="mt-2">
          <span className="text-caption text-ink-muted">📞 {translate("extracted.phones")}</span>
          <div className="mt-1 flex flex-col gap-1">
            {phones.map((p) => <CallButton key={p} phone={p} />)}
          </div>
        </div>
      )}
      {links.length > 0 && (
        <div className="mt-2">
          <span className="text-caption text-ink-muted">🔗 {translate("extracted.links")}</span>
          <ul className="mt-1 flex flex-col gap-1">
            {links.map((l) => (
              <li key={l}>
                <a href={l} target="_blank" rel="noopener nofollow" className="min-h-11 inline-flex items-center text-body text-link-cool-1 underline break-all">{l}</a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/** One labeled row of text chips (names/cédula/addresses). Hidden when empty. */
function Row({ icon, labelKey, values }: { icon: string; labelKey: MessageKey; values: string[] }) {
  if (!values.length) return null;
  return (
    <div className="mt-2">
      <span className="text-caption text-ink-muted">{icon} {translate(labelKey)}</span>
      <ul className="mt-1 flex flex-wrap gap-1">
        {values.map((v) => (
          <li key={v} className="rounded-pill bg-canvas px-2 py-0.5 text-body">{v}</li>
        ))}
      </ul>
    </div>
  );
}
```

**Note on the translator:** this is a server component, so it can't use the `useT()` hook. Check `src/lib/i18n/` for a non-hook translator. If `src/lib/i18n.ts` / `src/lib/i18n/index.ts` exports a plain `t(key)` (server-side, default locale), use it as shown. If only a hook exists, make `ExtractedChips` a `"use client"` component instead and use `useT()` (it's cheap, no state). Pick whichever the existing i18n module supports — verify before implementing. Use the same token classes the codebase already uses (`text-link-cool-1`, `bg-surface`, `border-hairline-soft`); confirm names against `globals.css` `@theme`.

- [ ] **Step 4: Run tests, expect pass**

Run: `pnpm test src/components/molecules/extracted-chips.test.tsx`
Expected: PASS (2 tests). If the empty-case returns non-empty string, ensure the early `return null` paths are correct.

- [ ] **Step 5: Commit**

```bash
git add src/components/molecules/extracted-chips.tsx src/components/molecules/extracted-chips.test.tsx
git commit -m "feat(ui): extracted-chips molecule (a11y: icon+label, external links)"
```

---

### Task 14: `note-form` + `note-item` molecules

**Files:**
- Create: `src/components/molecules/note-form.tsx`
- Create: `src/components/molecules/note-item.tsx`

**Interfaces:**
- Consumes: `addNote` (Task 11), `PublicNote` (Task 11), `ExtractedChips` (Task 13), `useT` (existing), i18n keys (Task 12).
- Produces: `<NoteForm reportId={string} />`, `<NoteItem note={PublicNote} />`.

- [ ] **Step 1: Implement note-item.tsx**

`src/components/molecules/note-item.tsx`:
```tsx
import { ExtractedChips } from "@/components/molecules/extracted-chips";
import type { PublicNote } from "@/lib/notes";

/** A single anonymous note + any data extracted from it. Presentational. */
export function NoteItem({ note }: { note: PublicNote }) {
  return (
    <li className="rounded-lg border border-hairline-soft bg-surface p-3">
      <p className="text-body whitespace-pre-wrap">{note.body}</p>
      <ExtractedChips extracted={note.extracted} />
    </li>
  );
}
```

- [ ] **Step 2: Implement note-form.tsx**

`src/components/molecules/note-form.tsx`:
```tsx
"use client";
import { useState } from "react";
import { addNote } from "@/lib/notes";
import { useT } from "@/lib/i18n/client";

const MAX = 1000;

/**
 * Anonymous note composer. Optimistic UX: the live `useNotes` query refreshes
 * the list when the insert + Realtime round-trip completes. a11y: aria-live
 * status, aria-invalid + visible ring on error, error clears on keystroke,
 * 44px submit target.
 */
export function NoteForm({ reportId }: { reportId: string }) {
  const t = useT();
  const [body, setBody] = useState("");
  const [state, setState] = useState<"idle" | "posting" | "posted" | "error" | "tooLong">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    if (text.length > MAX) { setState("tooLong"); return; }
    setState("posting");
    try {
      await addNote(reportId, text);
      setBody("");
      setState("posted");
    } catch {
      setState("error");
    }
  }

  const invalid = state === "error" || state === "tooLong";
  return (
    <form onSubmit={submit} className="mt-3">
      <label htmlFor="note-body" className="sr-only">{t("notes.placeholder")}</label>
      <textarea
        id="note-body"
        value={body}
        onChange={(e) => { setBody(e.target.value); if (invalid) setState("idle"); }}
        placeholder={t("notes.placeholder")}
        rows={3}
        maxLength={MAX + 100}
        aria-invalid={invalid}
        aria-describedby="note-status"
        className={`w-full rounded-lg border bg-canvas p-2 text-body-lg ${invalid ? "border-emergency ring-2 ring-emergency" : "border-hairline-soft"}`}
      />
      <div className="mt-2 flex items-center justify-between">
        <button type="submit" disabled={state === "posting" || !body.trim()} className="min-h-11 inline-flex items-center rounded-lg bg-link-cool-1 px-4 text-on-cool disabled:opacity-50">
          {state === "posting" ? t("notes.posting") : t("notes.submit")}
        </button>
        <p id="note-status" aria-live="polite" className="text-caption text-ink-muted">
          {state === "posted" && t("notes.posted")}
          {state === "error" && t("notes.error")}
          {state === "tooLong" && t("notes.tooLong")}
        </p>
      </div>
    </form>
  );
}
```

**Note:** verify the token class names (`bg-link-cool-1`, `text-on-cool`, `border-emergency`, `ring-emergency`) against the existing `globals.css` `@theme` and how `src/components/atoms/button.tsx` styles a primary button — reuse the `<Button>` atom if it fits rather than hand-rolling the button. Verify `useT` import path is `@/lib/i18n/client` (matches `report-detail-view.tsx`).

- [ ] **Step 3: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/molecules/note-form.tsx src/components/molecules/note-item.tsx
git commit -m "feat(ui): note-form + note-item molecules (a11y, optimistic)"
```

---

### Task 15: `report-notes` organism + wire into detail view

**Files:**
- Create: `src/components/organisms/report/report-notes.tsx`
- Modify: `src/components/organisms/report/report-detail-view.tsx`

**Interfaces:**
- Consumes: `useNotes` (Task 11), `NoteForm`/`NoteItem` (Task 14), `ExtractedChips` (Task 13), `PublicReport.extracted` (Task 9).
- Produces: `<ReportNotes reportId={string} />`; the detail view renders `ExtractedChips` + `ReportNotes`.

- [ ] **Step 1: Implement the organism**

`src/components/organisms/report/report-notes.tsx`:
```tsx
"use client";
import { NoteForm } from "@/components/molecules/note-form";
import { NoteItem } from "@/components/molecules/note-item";
import { useNotes } from "@/lib/notes";
import { useT } from "@/lib/i18n/client";

/**
 * Notes section for a public report: live list of visible notes + the
 * anonymous composer. Client component (live query + form state). The list
 * uses aria-live so screen readers hear newly-posted notes.
 */
export function ReportNotes({ reportId }: { reportId: string }) {
  const t = useT();
  const notes = useNotes(reportId);
  return (
    <section className="mt-6" aria-label={t("notes.heading")}>
      <h2 className="text-h2">{t("notes.heading")}</h2>
      <ul aria-live="polite" className="mt-2 flex flex-col gap-2">
        {notes && notes.length === 0 && (
          <li className="text-body text-ink-muted">{t("notes.empty")}</li>
        )}
        {notes?.map((n) => <NoteItem key={n.id} note={n} />)}
      </ul>
      <NoteForm reportId={reportId} />
    </section>
  );
}
```

- [ ] **Step 2: Wire into the detail view**

In `src/components/organisms/report/report-detail-view.tsx`:

Add imports:
```ts
import { ExtractedChips } from "@/components/molecules/extracted-chips";
import { ReportNotes } from "@/components/organisms/report/report-notes";
```

After the description `<p>…</p>` block (before the `ImageGallery` block) add:
```tsx
      <ExtractedChips extracted={report.extracted} />
```
(If `ExtractedChips` ended up as a server component but `report-detail-view` is `"use client"`, it still renders fine as a child — client components can render presentational components. If you made it `"use client"` per Task 13's note, no change needed.)

Before the closing `</article>` (after `<ReportActions … />`) add:
```tsx
      <ReportNotes reportId={report.id} />
```

- [ ] **Step 3: Typecheck + lint**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/organisms/report/report-notes.tsx src/components/organisms/report/report-detail-view.tsx
git commit -m "feat(ui): notes section + extracted chips on report detail"
```

---

### Task 16: Admin — re-extract button + note moderation

**Files:**
- Modify: the admin moderation detail/row component (`src/components/organisms/admin/moderation-row.tsx` — confirm the exact file that renders a single report's moderation controls)

**Interfaces:**
- Consumes: `POST /api/extract?force=1` (Task 8), existing moderation data access, `getSupabase` for hiding notes.
- Produces: a "Re-extraer" button and (optionally) a note hide/restore control in the admin report view.

- [ ] **Step 1: Read the admin components to find the seam**

Run: `sed -n '1,200p' src/components/organisms/admin/moderation-row.tsx`
Identify where per-report actions render (alongside the existing approve/flag/merge buttons) and how the moderator session/client is obtained.

- [ ] **Step 2: Add the re-extract action**

Add a button next to the existing moderation actions. It needs the report's `client_uuid`; the `reports_moderation` view already exposes `client_uuid` (confirm `ModReport`/`ModRow` in `src/lib/moderation.ts` carry it — add it to the select + interface if missing, mirroring the existing fields):
```tsx
<button
  type="button"
  onClick={() => {
    void fetch("/api/extract?force=1", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "report", clientUuid }),
    });
  }}
  className="min-h-11 inline-flex items-center rounded-lg border border-hairline-soft px-3 text-body"
>
  Re-extraer
</button>
```
If `client_uuid` is not yet on `ModReport`: in `src/lib/moderation.ts` add `clientUuid: string` to `ModReport`, `client_uuid: string` to `ModRow`, include `client_uuid` in the `.select(...)`, and map `clientUuid: r.client_uuid` in the row mapper.

- [ ] **Step 3: (Optional, same task) note hide/restore**

If you surface notes in the admin detail, a moderator hides a note by updating its status (RLS `notes_update_mod` allows it):
```ts
await supabase.from("report_notes").update({ status: "hidden" }).eq("id", noteId);
```
ponytail: skip building a full admin notes list unless needed now — the re-extract button is the required deliverable; note moderation can be a one-line update wired to a button when a moderator actually needs it.

- [ ] **Step 4: Typecheck + commit**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.
```bash
git add src/components/organisms/admin/ src/lib/moderation.ts
git commit -m "feat(admin): re-extract action (+ client_uuid on mod view)"
```

---

### Task 17: Env, full verification, lessons

**Files:**
- Modify: `.env.example`
- Modify: `tasks/lessons.md`

- [ ] **Step 1: Document env vars**

Append to `.env.example`:
```bash

# --- Structured extraction (all optional; missing keys = regex-only) ---
# Free-tier LLM pool — names/addresses extraction. App works with none set.
GROQ_API_KEY=
CEREBRAS_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
OPENROUTER_API_KEY=
# Optional model overrides:
# GROQ_MODEL=llama-3.3-70b-versatile
# GEMINI_MODEL=gemini-2.5-flash
# OPENROUTER_MODEL=meta-llama/llama-3.3-70b-instruct:free
# Server-only: lets /api/extract write extraction results back (bypasses RLS).
SUPABASE_SERVICE_ROLE_KEY=
# Cédula display: "true" (default) shows full cédula publicly; "false" masks it.
NEXT_PUBLIC_EXTRACT_CEDULA_FULL=true
```

- [ ] **Step 2: Run the full test suite + typecheck + lint**

Run: `pnpm test && pnpm exec tsc --noEmit && pnpm lint`
Expected: all tests PASS, no type errors, no lint errors.

- [ ] **Step 3: Manual smoke (dev server)**

```bash
pnpm dev   # in one shell
```
Then:
1. Open `/reportar`, file a report whose description is: `Busco a Ana Pérez, cédula V-12345678, tel 0414-1234567, info en https://wa.me/58414. Última vez en Av. Bolívar, Chacao.`
2. Open the report from the feed → confirm raw description shows, and (once the server extraction round-trips, give it a few seconds + refresh) the **Datos detectados** chips show cédula/phone/link (and names/address if an LLM key is configured).
3. With NO LLM keys set: confirm cédula/phone/link chips still appear (regex path), names/addresses empty.
4. Post a note containing a link → it appears in the list; its link surfaces as a chip after extraction.
5. Grayscale the screen (or check) → every chip category is still distinguishable by icon + label.

- [ ] **Step 4: Record lessons**

Append to `tasks/lessons.md` under a new `## Phase 4 / extraction + notes` heading:
```markdown
## Phase 4 / extraction + notes
- LLM pool ported from market-chat: round-robin (`pickTier1`) + in-memory circuit breaker. `server-only` imports break vitest — aliased to a stub in `vitest.config.ts`.
- Hybrid extraction: regex (cédula/phone/link, isomorphic, in `patterns.ts`) + LLM (names/addresses, `llm.ts`). Free models are sloppy → permissive zod schema, normalize after (`normalizeStrings`).
- Client can't reach the LLM (keys server-only). Offline-first means no server in the sync path, so extraction is a fire-and-forget `POST /api/extract { kind, clientUuid }` after sync / note insert. Idempotent on `extracted_at`; `?force=1` to redo.
- Notes are anonymous, keyed by client-generated `client_uuid`, rate-limited by the same ip_hash trigger pattern as reports (0002). Public reads go through `report_notes_public` to hide `ip_hash`.
- Cédula is full-public via `NEXT_PUBLIC_EXTRACT_CEDULA_FULL` (default true); `maskCedula` + `applyCedulaPolicy` in feed.ts flip it to masked in one env change.
```

- [ ] **Step 5: Final commit**

```bash
git add .env.example tasks/lessons.md
git commit -m "docs: extraction/notes env vars + phase 4 lessons"
```

---

## Self-Review

**Spec coverage:**
- Hybrid regex+LLM extraction → Tasks 3, 5. ✓
- LLM rotator (providers/router/breaker, 4 providers) → Tasks 1, 2. ✓
- `extracted` jsonb + `extracted_at` on reports → Task 6, surfaced Task 9. ✓
- Notes table (anon, ip_hash rate-limit, status, public view) → Task 6, data layer Task 11, UI 14–15. ✓
- `/api/extract` (idempotent, rate-limited, service-role) → Task 8. ✓
- Trigger after sync + after note insert → Tasks 10, 11. ✓
- On-demand re-extract → Task 16. ✓
- Public chips (color+icon+label, masked-cédula option, external links, CallButton) → Tasks 9, 13. ✓
- Cédula full-public day one (flag default true) → Task 9, env Task 17. ✓
- i18n es/en → Task 12. ✓
- Tests for patterns + normalize + extractAll + route + feed → Tasks 3,4,5,8,9. ✓
- Env vars, all optional, regex-only fallback → Tasks 2,7,17. ✓
- Out of scope (threaded notes, Turnstile, Edge Function, matcher UI) → not built. ✓

**Placeholder scan:** No "TBD"/"add error handling"/"similar to". Two tasks (13, 14, 16) carry explicit *verify-before-implement* notes for token class names + the i18n translator shape + the exact admin file — these are real codebase-grounding checks, not placeholders, because the surrounding conventions must be matched rather than guessed.

**Type consistency:** `Extracted` shape identical across types.ts, feed.ts, notes.ts, extract.ts, chips. `ProviderKey`/`TIER_1_ORDER`/`pickTier1` consistent across providers/router/llm. `clientUuid` is the extract-ping key end-to-end (sync → route → notes). `client_uuid` column present on both `reports` (existing) and `report_notes` (Task 6) — route selects by it for both. `report_notes_public` columns (id, report_id, body, extracted, created_at) match `NoteRow`/`useNotes` select. `extracted`/`extracted_at` column names consistent across migration, route, feed.
