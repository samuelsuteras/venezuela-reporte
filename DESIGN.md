---
version: alpha
name: ReporteVE-crisis-design
description: Emergency crisis-reporting design system for a Venezuela earthquake response PWA. Built for the slowest connections, cracked screens, bright daylight, and high-stress one-handed use. A high-contrast light canvas carries a 4-color severity taxonomy (red emergency, amber need, blue info, neutral resolved) that NEVER encodes meaning by color alone — every report pairs color + icon + Spanish label. Zero-download system-ui typography, oversized 48px+ touch targets, a single dominant "Reportar" action, and offline-first status surfaces (queued / sending / synced). Calm, legible, fast. The opposite of a marketing site.
colors:
  # ── Report taxonomy (the 4 colors) ───────────────────────────────
  # Each type ships THREE tokens: -fill (marker/badge background),
  # -on (icon/text drawn on the fill), -text (the color used as text
  # on the light canvas, darkened to clear WCAG AA 4.5:1).
  emergency-fill: "#d32029"
  emergency-on: "#ffffff"
  emergency-text: "#b3151d"
  need-fill: "#f59e0b"
  need-on: "#1a1308"
  need-text: "#8a5a00"
  info-fill: "#1d4ed8"
  info-on: "#ffffff"
  info-text: "#1740a8"
  resolved-fill: "#64748b"
  resolved-on: "#ffffff"
  resolved-text: "#475569"
  # ── Surfaces ─────────────────────────────────────────────────────
  canvas: "#ffffff"
  surface: "#f5f7fa"
  surface-sunk: "#eef1f5"
  canvas-night: "#0f1722"
  hairline: "#d7dde5"
  hairline-soft: "#e7ebf0"
  # ── Text ─────────────────────────────────────────────────────────
  ink: "#0f1722"
  ink-soft: "#384150"
  ink-muted: "#5b6675"
  on-night: "#f5f7fa"
  link: "#1740a8"
  link-cool-1: "#9cc4ff"
  # ── Semantic & sync status ───────────────────────────────────────
  success: "#1f8f4e"
  warning: "#8a5a00"
  danger: "#c81e1e"
  focus-ring: "#1d4ed8"
  status-offline: "#8a5a00"
  status-pending: "#5b6675"
  status-synced: "#1f8f4e"
typography:
  # System-ui stack = ZERO font download. Critical on 2G/EDGE links.
  display:
    fontFamily: system-ui
    fontSize: 32px
    fontWeight: 800
    lineHeight: 1.15
  h1:
    fontFamily: system-ui
    fontSize: 26px
    fontWeight: 700
    lineHeight: 1.2
  h2:
    fontFamily: system-ui
    fontSize: 21px
    fontWeight: 700
    lineHeight: 1.25
  h3:
    fontFamily: system-ui
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.3
  body-lg:
    fontFamily: system-ui
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.55
  body:
    fontFamily: system-ui
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.55
  body-bold:
    fontFamily: system-ui
    fontSize: 16px
    fontWeight: 700
    lineHeight: 1.5
  label:
    fontFamily: system-ui
    fontSize: 15px
    fontWeight: 600
    lineHeight: 1.3
  caption:
    fontFamily: system-ui
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.4
  button:
    fontFamily: system-ui
    fontSize: 17px
    fontWeight: 700
    lineHeight: 1.2
rounded:
  sm: 6px
  md: 10px
  lg: 14px
  xl: 20px
  pill: 999px
  circle: 9999px
spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  base: 16px
  md: 20px
  lg: 24px
  xl: 32px
  xxl: 40px
  section: 56px
components:
  # ── The dominant action ──────────────────────────────────────────
  report-fab:
    backgroundColor: "{colors.emergency-fill}"
    textColor: "{colors.emergency-on}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    minHeight: 56px
    padding: "16px 28px"
    shadow: "rgba(15, 23, 34, 0.28) 0px 4px 16px 0px"
  button-primary:
    backgroundColor: "{colors.info-fill}"
    textColor: "{colors.info-on}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    minHeight: 48px
    padding: "12px 20px"
  button-primary-pressed:
    backgroundColor: "#1740a8"
    textColor: "{colors.info-on}"
  button-secondary:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    minHeight: 48px
    padding: "12px 20px"
    border: "1.5px solid {colors.hairline}"
  button-disabled:
    backgroundColor: "{colors.surface-sunk}"
    textColor: "{colors.ink-muted}"
  # ── Report taxonomy controls ─────────────────────────────────────
  type-chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    minHeight: 44px
    padding: "10px 16px"
    border: "1.5px solid {colors.hairline}"
  type-chip-selected:
    border: "2.5px solid currentColor"
    note: "currentColor = the type's -text token; selection also flips an aria-pressed=true icon fill"
  type-option-emergency:
    backgroundColor: "{colors.emergency-fill}"
    textColor: "{colors.emergency-on}"
    rounded: "{rounded.lg}"
    minHeight: 64px
    icon: "alert-triangle"
    label: "Emergencia"
  type-option-need:
    backgroundColor: "{colors.need-fill}"
    textColor: "{colors.need-on}"
    rounded: "{rounded.lg}"
    minHeight: 64px
    icon: "hand-helping"
    label: "Necesidad"
  type-option-info:
    backgroundColor: "{colors.info-fill}"
    textColor: "{colors.info-on}"
    rounded: "{rounded.lg}"
    minHeight: 64px
    icon: "info"
    label: "Información / Ayuda"
  type-option-resolved:
    backgroundColor: "{colors.resolved-fill}"
    textColor: "{colors.resolved-on}"
    rounded: "{rounded.lg}"
    minHeight: 64px
    icon: "check-circle"
    label: "Resuelto"
  # ── Feed & detail ────────────────────────────────────────────────
  report-card:
    backgroundColor: "{colors.canvas}"
    rounded: "{rounded.lg}"
    padding: "{spacing.base}"
    border: "1px solid {colors.hairline-soft}"
    accentBar: "4px left border in the report type -fill token"
  status-badge:
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: "3px 10px"
    note: "Pairs an icon + word. status-pending/offline/synced color tokens."
  # ── Inputs ───────────────────────────────────────────────────────
  text-input:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.md}"
    minHeight: 48px
    padding: "12px 14px"
    border: "1.5px solid {colors.hairline}"
  text-input-focused:
    border: "2.5px solid {colors.focus-ring}"
  text-input-error:
    border: "2.5px solid {colors.danger}"
    note: "aria-invalid=true + error label in {colors.danger}; clears on keystroke"
  photo-dropzone:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.lg}"
    minHeight: 96px
    border: "1.5px dashed {colors.hairline}"
    note: "Camera capture on mobile (capture=environment). Compresses client-side before queueing."
  # ── Map & navigation ─────────────────────────────────────────────
  marker-pin:
    rounded: "{rounded.circle}"
    size: 32px
    border: "2px solid {colors.canvas}"
    note: "Fill = report type -fill token; carries the type icon in -on color so it reads without color."
  marker-cluster:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.canvas}"
    rounded: "{rounded.circle}"
    note: "Count label; ring segments tinted by the mix of contained report types."
  filter-pill:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    minHeight: 44px
    padding: "8px 14px"
  bottom-nav:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink-soft}"
    border: "1px solid {colors.hairline-soft}"
    minHeight: 56px
    note: "Reportar · Mapa · Lista · Mi reporte. Icon + Spanish label, active in {colors.info-text}."
  # ── Offline / sync surfaces ──────────────────────────────────────
  offline-banner:
    backgroundColor: "{colors.canvas-night}"
    textColor: "{colors.on-night}"
    typography: "{typography.label}"
    padding: "{spacing.xs} {spacing.base}"
    note: "aria-live=polite. Shows count of reports queued for sync."
  sync-toast:
    backgroundColor: "{colors.success}"
    textColor: "{colors.canvas}"
    rounded: "{rounded.md}"
    typography: "{typography.label}"
    note: "Confirms 'Reporte enviado'. aria-live=polite."
  skip-link:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.canvas}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    note: "Visually hidden until focused; jumps to #main."
---

## Overview

This is an **emergency reporting tool**, not a marketing site. Every design decision optimizes for: the slowest internet possible (2G / intermittent), cracked or low-end phones, outdoor daylight glare, and a frightened user acting one-handed. The visual language is calm, blunt, and oversized — nothing decorative competes with the one job: **see what's happening near me, or report something fast.**

The system pivots on a **4-color severity taxonomy** that is the product's core vocabulary:

| Color | Token family | Meaning (ES label) | Icon |
|---|---|---|---|
| 🔴 Red | `emergency-*` | **Emergencia** — atrapados, heridos, persona desaparecida urgente | `alert-triangle` |
| 🟡 Amber | `need-*` | **Necesidad** — agua, comida, medicina, refugio | `hand-helping` |
| 🔵 Blue | `info-*` | **Información / Ayuda** — recursos, zonas seguras, voluntarios | `info` |
| ⚪ Neutral | `resolved-*` | **Resuelto** — encontrado, cerrado, atendido | `check-circle` |

**Non-negotiable rule: color never carries meaning alone.** ~8% of men have a red/green deficiency and screens may be cracked or sun-washed. Every report surface — marker, chip, card accent, badge — renders **color + icon + Spanish word together**. See § Accessibility.

**Key characteristics:**
- **Zero-download type.** `system-ui` everywhere. No web font request, no FOIT, instant first paint on 2G.
- **One dominant action.** The red `report-fab` ("Reportar") is the single loudest element on every screen.
- **Oversized targets.** 48px minimum interactive height, 56–64px for primary report actions — usable while panicked or gloved.
- **Light canvas, hard contrast.** White ground, near-black ink (16:1) — survives direct sunlight where mid-grays vanish.
- **Status is first-class.** Offline / queued / sending / synced are always visible, never hidden — trust depends on the user knowing their report is safe.

## Colors

> Contrast: every text token below clears WCAG 2.2 AA (4.5:1 normal, 3:1 large) on `{colors.canvas}`. Run `npx @google/design.md lint DESIGN.md` after edits to re-verify.

### Report taxonomy
Each type carries three roles. Never use a `-fill` token as text on white (the amber and slate fills fail contrast); use the matching `-text` token instead.
- **Emergency** — fill `{colors.emergency-fill}` (white icon/text on it), text-on-canvas `{colors.emergency-text}`.
- **Need** — fill `{colors.need-fill}` (note: amber needs **dark** `{colors.need-on}` text, not white), text-on-canvas `{colors.need-text}`.
- **Info** — fill `{colors.info-fill}` (white on it), text-on-canvas `{colors.info-text}`.
- **Resolved** — fill `{colors.resolved-fill}` (white on it), text-on-canvas `{colors.resolved-text}`.

### Surface
- **Canvas** `{colors.canvas}` — page + card ground.
- **Surface** `{colors.surface}` / **Surface Sunk** `{colors.surface-sunk}` — input rest, chips, dropzones.
- **Canvas Night** `{colors.canvas-night}` — the offline banner and any dark sheet. Text on it MUST use `{colors.on-night}` or `{colors.link-cool-1}`.
- **Hairline** `{colors.hairline}` / **Hairline Soft** `{colors.hairline-soft}` — borders and dividers.

### Text
- **Ink** `{colors.ink}` — primary text (≈16:1, AAA).
- **Ink Soft** `{colors.ink-soft}` — secondary text.
- **Ink Muted** `{colors.ink-muted}` — tertiary / captions (AA, do not go lighter).
- **Link** `{colors.link}` — links on light. **Link Cool 1** `{colors.link-cool-1}` — links/text on `canvas-night`.

### Semantic & sync
- **Success** `{colors.success}` — synced, confirmed.
- **Warning** `{colors.warning}` — offline / queued.
- **Danger** `{colors.danger}` — validation + destructive.
- **Focus Ring** `{colors.focus-ring}` — the single focus-visible color across the app.
- **Status** `{colors.status-offline}` / `{colors.status-pending}` / `{colors.status-synced}` — the sync lifecycle.

## Typography

### Font family
**`system-ui`** with the platform fallback chain (`-apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif`). Deliberately no custom/web font: a downloaded face is dead weight on the connections this app must serve, and risks invisible text during load. The native face also renders crisply at small sizes on cheap devices.

### Hierarchy

| Token | Size | Weight | Line Height | Use |
|---|---|---|---|---|
| `{typography.display}` | 32px | 800 | 1.15 | Splash / empty-state headline |
| `{typography.h1}` | 26px | 700 | 1.2 | Screen title |
| `{typography.h2}` | 21px | 700 | 1.25 | Section header |
| `{typography.h3}` | 18px | 600 | 1.3 | Card title, report subject |
| `{typography.body-lg}` | 18px | 400 | 1.55 | Form fields, report body (larger for stress legibility) |
| `{typography.body}` | 16px | 400 | 1.55 | Standard body |
| `{typography.body-bold}` | 16px | 700 | 1.5 | Body emphasis |
| `{typography.label}` | 15px | 600 | 1.3 | Chips, badges, nav labels |
| `{typography.caption}` | 13px | 400 | 1.4 | Timestamps, helper text |
| `{typography.button}` | 17px | 700 | 1.2 | All button labels |

### Principles
- Body sizes lean **one step larger** than a typical app (18px form fields) — readability under stress and on small screens beats density.
- Weight does the hierarchy work, not font-family. Headlines are heavy `system-ui`, never a second face.
- No letter-spacing tricks; `system-ui` metrics vary per platform, so keep type robust to that.

## Layout

### Spacing
4px base scale: `{spacing.xxs}` 4 · `{spacing.xs}` 8 · `{spacing.sm}` 12 · `{spacing.base}` 16 · `{spacing.md}` 20 · `{spacing.lg}` 24 · `{spacing.xl}` 32 · `{spacing.xxl}` 40 · `{spacing.section}` 56.

### Grid & container
- **Mobile-first, single column.** Max content width 560px; the app is a tall scroll, centered on tablet/desktop with `{colors.surface}` gutters.
- Map and feed are the two primary surfaces; on ≥1024px they may sit side-by-side (map left ~60%, feed right ~40%), but mobile keeps them as separate `bottom-nav` destinations.
- Form is always single-column — never split a crisis form into columns.

### Whitespace
Generous vertical rhythm (`{spacing.md}`–`{spacing.lg}` between groups) so big touch targets never crowd. The `report-fab` floats bottom-right with `{spacing.base}` inset, clear of the `bottom-nav`.

## Shapes

| Token | Value | Use |
|---|---|---|
| `{rounded.sm}` | 6px | Skip link, micro-controls |
| `{rounded.md}` | 10px | Buttons, inputs |
| `{rounded.lg}` | 14px | Cards, type options, dropzone |
| `{rounded.xl}` | 20px | Bottom sheets, modals |
| `{rounded.pill}` | 999px | Chips, badges, the `report-fab` |
| `{rounded.circle}` | 50% | Map markers, avatar dots |

Rounding is friendly but restrained — this is not a toy. Markers are circles so they read as map pins; everything else is gently rounded rectangles.

## Component Architecture

> Canonical atomic-design layer map. CLAUDE.md § Project Conventions points here. Pick the **lowest** layer that satisfies scope; cross-section organism imports flow through `organisms/shared/` only. No barrel `index.ts` files.

```
src/components/
  ui/                       # shadcn (base-ui) primitives + BoneSkeleton wrapper
  atoms/                    # Button, IconButton, Chip, StatusBadge, Input,
                            # Textarea, Icon, Spinner, SkipLink, TypePin
  molecules/                # ReportTypeSelector, PhotoUpload, LocationPicker,
                            # FilterBar, SyncStatus, ReportCard, FieldRow
  organisms/
    report/                 # ReportForm, ReportFeed, ReportDetail
    map/                    # MapView, MarkerLayer, MapControls, LocateButton
    admin/                  # ModerationQueue, ModerationRow, FlagDialog
    shared/                 # AppHeader, OfflineBanner, BottomNav, ReportFab
  templates/                # AppShell, ReportTemplate, MapTemplate, AdminTemplate
```

- **Atoms** own no domain logic — pure presentational, fully reusable.
- **Molecules** compose atoms into one task unit (e.g. `LocationPicker` = map preview + GPS button + address field).
- **Organisms** own a screen region and may talk to data (Supabase / Dexie outbox). Domain folders (`report/`, `map/`, `admin/`) never import each other directly — shared pieces live in `organisms/shared/`.
- **Templates** lay out organisms into a page; route `page.tsx` files stay thin and server-rendered where possible.
- `"use client"` only on components owning state/refs/browser APIs (map, form, geolocation, outbox). The feed list and report detail render as RSC.

## Components

> No hover-only states — touch is the primary input. Default + pressed/focus/selected only.

### Actions
**`report-fab`** — the product's loudest element. Red pill, "＋ Reportar", floats bottom-right above `bottom-nav`. 56px min height, drop shadow for elevation over the map. Opens `ReportForm`.

**`button-primary`** — blue, primary in-form/confirm action ("Enviar reporte", "Usar mi ubicación"). 48px min. Pressed deepens to `#1740a8`.

**`button-secondary`** — white with hairline border, secondary action ("Elegir en el mapa", "Cancelar").

**`button-disabled`** — sunk surface + muted text; used while a required field is empty or a send is in flight (paired with `Spinner`).

### Report taxonomy
**`type-option-*`** (emergency / need / info / resolved) — the big 64px selector tiles in the report form. Each shows its `-fill` background, its icon, and its Spanish label together. This is where the user picks the color; they are selecting a **meaning**, reinforced three ways.

**`type-chip`** / **`type-chip-selected`** — compact filter chips in `FilterBar`. Selected state uses a 2.5px ring in the type's `-text` color + `aria-pressed=true`, not just a fill swap.

**`marker-pin`** — 32px circle, type `-fill` background, white border ring, type icon centered in `-on` color. Reads as a typed pin even in grayscale.

### Feed & detail
**`report-card`** — white card, 4px left accent bar in the type `-fill`, `TypePin` + label top-left, `StatusBadge` top-right, subject in `{typography.h3}`, 2-line description clamp, relative timestamp + distance in `{typography.caption}`. Thumbnail lazy-loads and is dropped entirely under `Save-Data`.

**`status-badge`** — icon + word pill: `Pendiente` (queued, `status-pending`), `Sin conexión` (`status-offline`), `Enviado` (`status-synced`), `Verificado` (`success`), `Marcado` (`warning`). Never icon-only.

### Inputs
**`text-input`** / **`text-input-focused`** / **`text-input-error`** — 48px min, 18px text. Error = 2.5px danger border + `aria-invalid` + message that clears on keystroke.

**`photo-dropzone`** — dashed surface tile. Mobile triggers camera (`capture="environment"`); selected images compress client-side to ~50–100KB WebP **before** entering the outbox. Shows per-image upload/queue state.

### Map & navigation
**`marker-cluster`** — dark count bubble with type-tinted ring segments; expands on zoom. **`filter-pill`** row toggles which of the 4 types show. **`LocateButton`** centers on GPS. **`bottom-nav`** — Reportar · Mapa · Lista · Mi reporte, icon + label, active in `info-text`, `aria-current="page"`.

### Offline / sync
**`offline-banner`** — dark strip, `aria-live="polite"`, shows "Sin conexión — N reportes en cola". **`sync-toast`** — green "Reporte enviado", `aria-live="polite"`. **`skip-link`** — hidden until focused, jumps to `#main`.

## Accessibility

> WCAG 2.2 AA is the merge bar for every component and page. CLAUDE.md § Project Conventions points here. This is the canonical checklist.

### Hard rules
- **Color is never the only signal.** Every report type renders **color + icon + Spanish label** together (markers, chips, cards, badges). A grayscale screenshot must still be fully usable.
- **Contrast.** Body/UI text clears 4.5:1, large text 3:1 on its surface. Use `-text` tokens (not `-fill`) for type colors as text. On `canvas-night`, text uses `{colors.on-night}` or `{colors.link-cool-1}` — never `{colors.ink-muted}` (fails on dark).
- **Touch targets** ≥ 44×44px (use `min-h-11 inline-flex items-center`); primary report actions 48–64px.
- **Focus visible.** Single `focus-visible` ring in `{colors.focus-ring}`, 2.5px, never removed. Logical tab order; the report form is keyboard-completable end to end.
- **Forms.** Every field has a real `<label htmlFor>`; hints/errors wired via `aria-describedby`. Errors set `aria-invalid` + visible danger ring and clear on keystroke.
- **State semantics.** Interactive non-links carry `aria-pressed` / `aria-selected` / `aria-current` per state (type chips, filter pills, nav).
- **Live regions** (`aria-live="polite"`) for all async/offline surfaces: offline banner, sync toast, upload status, feed-updated count.
- **Landmarks.** Every layout has the skip link; every `<main>` has `id="main"`. Header/nav/main/footer use real landmark elements.
- **Motion.** `@media (prefers-reduced-motion: reduce)` honored globally — disable marker drop animations, map fly-to easing, toast slides.
- **Language.** `<html lang="es">` default; the EN toggle updates `lang`. All ARIA strings localized.
- **Map fallback.** The map is never the only way to read reports — the **list view is the accessible equivalent** and the default on slow links. Markers expose `role`/label; keyboard users reach reports via the list.

## Low-Bandwidth & Offline Design

> A first-class concern, not an afterthought. The target user may be on 2G with an intermittent signal after an earthquake.

- **System font, no web font** — zero typography bytes.
- **List-first.** Default landing is the text feed, not the map. The map (and its tiles) load only when the user opens the Mapa tab.
- **Respect `Save-Data` + `navigator.connection`.** On `saveData` or `effective-type` ≤ 2g: drop image thumbnails to a tap-to-load placeholder, skip map auto-load, reduce page size.
- **Client-side image compression** to ~50–100KB WebP before anything touches the network or the outbox.
- **Offline outbox.** Reports submit fully offline into IndexedDB and flush via background sync — the user never waits on a connection to file an emergency.
- **Precache the app shell + vector tiles** via the service worker so a return visit (or a dropped signal) still renders.
- **Tiny payloads.** Feed responses are slim JSON, paginated; RSC keeps client JS minimal; skeletons use boneyard (no layout shift) while the slim data arrives.
- **Optimistic UI.** A submitted report appears in "Mi reporte" instantly with a `Pendiente` badge; it never blocks on the server.

## Responsive Behavior

| Name | Width | Key changes |
|---|---|---|
| Mobile | < 768px | Single column. `bottom-nav` is the primary navigation. Map and feed are separate tabs. `report-fab` bottom-right. |
| Tablet | 768–1023px | Same single column centered at 560px; larger type-option tiles two-up. |
| Desktop | ≥ 1024px | Optional split view: map left (~60%) + feed right (~40%). `bottom-nav` becomes a top/side nav. `report-fab` persists. |

### Touch targets
All interactive elements ≥ 44px; report actions 48–64px; the `report-fab` is the largest at 56px+. Form fields are 48px tall with 18px text.

## Iteration Guide

1. One component at a time; reference tokens directly (`{colors.emergency-fill}`, `{component}-pressed`), never paraphrase.
2. Run `npx @google/design.md lint DESIGN.md` after edits — catches broken refs, contrast failures, orphaned tokens.
3. Add variants as separate `components:` entries (`-pressed`, `-error`, `-selected`), not buried in prose.
4. Before merging any report-bearing surface, grayscale it: if a type is ambiguous without color, the icon/label pairing is missing — fix before shipping.
5. Default body to `{typography.body}` / forms to `{typography.body-lg}`. Headlines step `display → h1 → h2 → h3`.
6. Keep `{colors.emergency-fill}` scarce outside the `report-fab` and emergency reports — its loudness is the point.

## Known Gaps

- **Dark mode** tokens beyond `canvas-night` are not fully specified; if added, mirror every `-text` token with a dark-surface-safe variant and re-lint contrast.
- **Animation timings** intentionally minimal; default 120–200ms ease-out, fully suppressed under reduced-motion.
- **Map marker keyboard interaction** spec is high-level — the list view is the guaranteed accessible path; richer marker focus handling is a phase-2 refinement.
- **Verified-volunteer badge** visual is reserved for a future trust phase (see PLAN.md phase 2), not yet tokenized.
