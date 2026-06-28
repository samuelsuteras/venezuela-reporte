# AGENTS.md — Agent-Ready Surface

Single source of truth for any AI agent (LLM, MCP client, UI builder, or external integration) consuming market-chat. Read this first.

**Read alongside:** `CLAUDE.md` (workflow + conventions), `DESIGN.md` (visual spec + a11y), `tasks/todo.md` (current scope), `tasks/lessons.md` (prior gotchas).

---

## 1. HTTP API — public surface

Base URL: `${BETTER_AUTH_URL}/api` (dev: `http://localhost:3000/api`).

All endpoints return JSON. Errors use `{ error: string, code?: string, details?: unknown }` w/ standard HTTP status codes. Helpers in `src/lib/api/schemas.ts` (`badRequest`, `notFoundResponse`, `serverError`).

---

## 2. Skeleton library — Boneyard

`src/components/ui/loading-bones.tsx` exports named per-surface wrappers. Hand-rolled `animate-pulse` is **banned** in `src/app/**` and `src/components/**`.

Existing wrappers:
- `PlpGridBones`, `PdpBones`, `CategoryBones`, `SearchResultsBones`
- `StorefrontShellBones`, `AdminShellBones`
- `AutocompleteRowBones`, `AssistantThinkingBones`

**To add a new skeleton:**
1. Add wrapper to `loading-bones.tsx` with a stable kebab-case `name` + inline-geometry `fixture`.
2. Mount it in `src/app/dev/bones/page.tsx` showcase.
3. Run `pnpm dev` (one shell) + `pnpm bones:build` (another). CLI overwrites `src/bones/registry.ts` — never hand-edit.
4. Commit `*.bones.json` + regenerated registry.

The `<BoneSkeleton>` SSR mount-guard is required — removing it breaks hydration via boneyard's `data-boneyard-content` attribute.

Tokens baked in `src/components/ui/bone-skeleton.tsx`: shimmer 1.6s, 110° angle, `shade-30 @ 60%` light, `aloe-10 @ 10%` dark.

---

## 3. Accessibility — WCAG 2.2 AA baseline

Every new component / page must hold AA before merge. Canonical checklist: `DESIGN.md § Accessibility`.

**Hard rules** (from `CLAUDE.md § 3`):
- Touch targets ≥ 44×44px (use `min-h-11` + `inline-flex items-center`).
- Text on `canvas-night` uses `text-link-cool-1` minimum (7.7:1). Never `text-shade-50` on dark.
- Form fields with validation errors: `aria-invalid` + visible red ring, auto-clear on keystroke.
- Interactive non-link elements: `aria-pressed` / `aria-selected` / `aria-current` per state.
- Live regions (`aria-live="polite"`) for streamed/async UI.
- Every `<main>` has `id="main"`, every layout has a skip-link.
- `@media (prefers-reduced-motion: reduce)` honoured globally.
- `<label htmlFor>` associations + `aria-describedby` hint wiring on every form field.

**Utilities already in place:** `<NavLink>` (atoms), `.sr-only`, `.skip-link`, `:focus { scroll-margin }`, `@media (forced-colors: active)` outline guarantee. Sonner Toaster mounted at root.

---

## 4. Smoke / verify commands

| Command | Purpose |
|---|---|
| `pnpm typecheck` | TypeScript zero-error gate |
| `pnpm dev` | Next 16 dev server (`http://localhost:3000`) |
| `pnpm db:push` | Apply Drizzle schema |
| `pnpm db:seed` | Sample warehouse + catalog |
| `pnpm cart:smoke` | Cart-core round-trip (CRUD + coupon) |
| `pnpm mcp:cart-smoke` | MCP cart-tools round-trip |
| `bash scripts/mcp-smoke.sh` | MCP catalog-tools probe |
| `pnpm search:reindex` | Bulk-sync products → Meilisearch |
| `pnpm bones:build` | Re-capture all Boneyard fixtures |
| `pnpm meili:dev` | Local Meilisearch on `:7700` |

---

## 5. What an agent should do before building UI

1. Read this file + `DESIGN.md § Component Architecture, Tokens, Accessibility, Loading States`.
2. Confirm the HTTP endpoint or MCP tool it needs exists (table above). If not, ask for it before mocking.
3. Pick the lowest atomic layer that fits.
4. Use a `<BoneSkeleton>` wrapper (existing or new) for all loading states.
5. Hold WCAG 2.2 AA on first commit — don't defer a11y to "polish".
6. Run `pnpm typecheck` before reporting done.
