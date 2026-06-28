## ## Workflow Orchestration

### ### 1. Plan Mode Default

* Enter plan mode for **ANY** non-trivial task (3+ steps or architectural decisions)
* If something goes sideways, **STOP** and re-plan immediately – don't keep pushing
* Use plan mode for verification steps, not just building
* Write detailed specs upfront to reduce ambiguity
* Always read local CLAUDE.md and DESIGN.md

### ### 2. Subagent Strategy

* Use subagents liberally to keep main context window clean
* Offload research, exploration, and parallel analysis to subagents
* For complex problems, throw more compute at it via subagents
* One task per subagent for focused execution

### ### 3. Self-Improvement Loop

* After **ANY** correction from the user: update `tasks/lessons.md` with the pattern
* Write rules for yourself that prevent the same mistake
* Ruthlessly iterate on these lessons until mistake rate drops
* Review lessons at session start for relevant project

### ### 4. Verification Before Done

* Never mark a task complete without proving it works
* Diff behavior between main and your changes when relevant
* Ask yourself: "Would a staff engineer approve this?"
* Run tests, check logs, demonstrate correctness

### ### 5. Demand Elegance (Balanced)

* For non-trivial changes: pause and ask "is there a more elegant way?"
* If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
* Skip this for simple, obvious fixes – don't over-engineer
* Challenge your own work before presenting it

### ### 6. Autonomous Bug Fixing

* When given a bug report: **just fix it.** Don't ask for hand-holding
* Point at logs, errors, failing tests – then resolve them
* Zero context switching required from the user
* Go fix failing CI tests without being told how

---

## ## Task Management

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections

---

## ## Core Principles

* **Simplicity First**: Make every change as simple as possible. Impact minimal code.
* **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
* **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.

---

## ## Project Conventions (non-negotiable)

### ### 1. Atomic Component Architecture

* Component tree is **atomic design** — see `DESIGN.md § Component Architecture` for the canonical layer map.
* Layout: `src/components/{atoms,molecules,organisms/<section>,templates}` + shadcn under `ui/`.
* When adding a component: pick the **lowest** atomic level that satisfies its scope. Drift downward if reused across two domains.
* Organism cross-section imports flow through `organisms/shared/` only — domain organisms (`product/`, `admin/`, `assistant/`) never import each other directly.
* No barrel `index.ts` files. Next 16 RSC penalises them.
* `"use client"` only when the component owns state, refs, or browser APIs.

### ### 2. Skeleton Loading States — Boneyard Only

* All loading placeholders use `boneyard-js` via the `<BoneSkeleton>` wrapper at `src/components/ui/bone-skeleton.tsx`. Hand-rolled `animate-pulse` is banned in `src/app/**` and `src/components/**`.
* Per-surface bones live in `src/components/ui/loading-bones.tsx` (one wrapper per `name`, fixture baked in).
* New skeleton:
  1. Add wrapper to `loading-bones.tsx` w/ stable `name` + inline-geometry `fixture`.
  2. Mount it in `src/app/dev/bones/page.tsx` showcase.
  3. Run `pnpm dev` in one shell, `pnpm bones:build` in another. CLI overwrites `src/bones/registry.ts` — never hand-edit it.
  4. Commit the `*.bones.json` + regenerated registry.
* Suspense fallbacks → use the per-surface wrapper, not raw `<BoneSkeleton>`.
* The `BoneSkeleton` wrapper has an SSR mount-guard. Don't remove it — boneyard's client-only `data-boneyard-content` attribute breaks hydration otherwise.

### ### 3. Accessibility — WCAG 2.2 AA baseline

* Every new component / page must hold the WCAG 2.2 AA bar before merge. See `DESIGN.md § Accessibility` for the canonical checklist.
* Hard rules:
  - Touch targets ≥ 44×44px (use `min-h-11` + `inline-flex items-center`).
  - Color never encodes report meaning alone — every report type renders color + icon + Spanish label together (a grayscale screenshot must stay usable).
  - Use a type's `-text` token (not `-fill`) when drawing it as text on the canvas. Text on `canvas-night` uses `link-cool-1` / `on-night`; never `ink-muted` on dark — it fails contrast.
  - Form fields with validation errors: `aria-invalid` + visible red ring, auto-clear on keystroke.
  - Interactive non-link elements: `aria-pressed` / `aria-selected` / `aria-current` per state.
  - Live regions (`aria-live="polite"`) for streamed / async UI (assistant transcript, autocomplete count, upload status).
  - Every `<main>` has `id="main"`, every layout has the skip-link.
  - `@media (prefers-reduced-motion: reduce)` honoured globally.
* When extracting a client subtree, keep `<label htmlFor>` associations and `aria-describedby` hint wiring.

### ### 4. Open-Source Code Documentation

* This project is **open source** — strangers will read, fork, and contribute. Optimize for the next contributor, not just the next session.
* **Every function gets a doc comment** explaining *what it does, its params, its return, and any non-obvious why.* Use JSDoc/TSDoc (`/** ... */`) on exported functions, components, hooks, and route handlers.
* Comment the *why*, not the obvious *what*, inline: offline-sync edge cases, geo math, contrast/a11y choices, low-bandwidth tradeoffs — anything a newcomer would otherwise have to reverse-engineer.
* React components: a TSDoc block stating purpose + key props + whether it's a client/server component. Mark intentional simplifications with a `// ponytail:` comment naming the ceiling.
* Keep comments truthful and current — update them with the code. A stale comment is worse than none.

### ### 5. Read Both Files Every Session

* `CLAUDE.md` (this file) — workflow + project conventions.
* `DESIGN.md` — visual spec, tokens, atomic layer rules, a11y checklist, boneyard recipe.
* `tasks/lessons.md` — gotchas from prior sessions (always grep before fighting a regression).
* `tasks/todo.md` — gotchas from prior sessions (always grep before fighting a regression).
