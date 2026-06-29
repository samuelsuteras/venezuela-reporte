# tasks/todo.md

## Phase 0 — Foundation ✅ COMPLETE

- [x] Scaffold Next 16 + TS + Tailwind v4 + ESLint + pnpm
- [x] Decisions: MIT license, Protomaps/PMTiles tiles
- [x] Install Serwist (PWA) + boneyard-js (skeletons)
- [x] Tailwind v4 theme from DESIGN.md tokens (`globals.css @theme`)
- [x] Atomic folder structure (`atoms/molecules/organisms/{report,map,admin,shared}/templates`)
- [x] Root layout: `lang="es"`, system font, skip-link, `#main`, metadata, viewport, theme-color
- [x] PWA: `manifest.ts` + Serwist service worker (`sw.ts`, `withSerwist`) + app icons (SVG)
- [x] BoneSkeleton wrapper (`ui/bone-skeleton.tsx`, hydration-safe mount-guard)
- [x] `loading-bones.tsx` (ReportCard seed + fixture) + `bones/registry.ts` placeholder + `bones:build` script + `/dev/bones` showcase
- [x] LICENSE (MIT)
- [x] Landing page (header, 4-color legend, Reportar FAB placeholder)
- [x] Verify: `pnpm build` ✅ · `pnpm lint` ✅ · dev server boots, `/` `200` `lang="es"`, `/manifest.webmanifest` `200`, `/dev/bones` `200`

### Review
- **Build:** `next build --webpack` clean. Routes: `/`, `/dev/bones`, `/manifest.webmanifest`, `/_not-found`. SW `public/sw.js` (49KB) generated.
- **Key deviation — webpack over Turbopack:** `@serwist/next` is webpack-only and conflicts with Next 16's default Turbopack (build error: "webpack config with no turbopack config"). A reliable offline SW is core to this app, so we build with `--webpack` (fully supported) instead of betting on experimental `@serwist/turbopack`. Revisit when `@serwist/turbopack` is stable.
- **Skeleton mount-guard:** uses `useSyncExternalStore` (not `useEffect`+`setState`) — hydration-safe and avoids the `react-hooks/set-state-in-effect` error.
- **a11y baked in:** skip-link, `#main`, `lang="es"`, reduced-motion global, single focus ring, color+icon+label taxonomy.

### Parked follow-ups
- PNG + Apple-touch icon set (SVG-only now; rasterize later — maybe via image-gen).
- Run `pnpm bones:build` once a dev server + headless Chrome (Playwright) is available to populate `registry.ts`.

---

## Phase 1 — Reporting MVP ✅ COMPLETE

- [x] Supabase schema: `supabase/migrations/0001_init.sql` — enums, PostGIS, RLS (anon insert 'pending' only; public read via `reports_public` view that omits `contact_phone`), Storage bucket + policies
- [x] `ReportForm`: 4-type selector (native radios), title/description/phone, inline a11y validation (errors clear on keystroke)
- [x] Photo upload + client-side WebP compression (~100KB / 1280px, web worker)
- [x] `LocationPicker`: GPS one-tap + address text + clear (drag-pin deferred to Phase 2 w/ MapView)
- [x] Dexie outbox + client-driven sync (idempotent upsert on `client_uuid`, optimistic UI)
- [x] "Mis reportes" live view (Dexie `useLiveQuery`) with sync-state badges + skeletons
- [x] Offline banner + sync toast (aria-live)
- [x] Routes `/reportar`, `/mis-reportes`; home FAB wired; `.env.example`

### Review
- **Verified:** `tsc --noEmit` ✅ · `pnpm lint` ✅ · `pnpm build` ✅ (8 routes, SW 49KB) · dev `/` `/reportar` `/mis-reportes` all `200` with Spanish content.
- **NOT yet verified (needs a real browser + Supabase project):** the IndexedDB enqueue→sync round-trip, geolocation, camera capture, image compression, and Supabase upsert/Storage upload. Build/types/SSR pass; the live data flow needs manual testing once env vars + the SQL migration are applied.
- **Architecture:** offline-first — the form writes to IndexedDB and never blocks on network; `flushOutbox` pushes to Supabase on mount/online/foreground. App is fully usable with NO Supabase configured (reports stay "En cola").
- **Idempotency:** `upsert(..., { ignoreDuplicates: true })` + image `upsert:false` tolerating 409 → RLS needs only INSERT policies; retries after a dropped response are no-ops.

### Deferred to later phases
- Drag-pin-on-map location → Phase 2 (needs MapView/MapLibre).
- True closed-app Background Sync API → enhancement (client-driven flush covers the realistic reopen-on-signal case).
- Full image thumbnails in cards → Phase 2 feed.

## Phase 1 — manual test checklist (run in a browser)
- [ ] Apply `supabase/migrations/0001_init.sql`; set `.env` from `.env.example`.
- [ ] Submit a report offline (DevTools → Network → Offline) → appears in Mis reportes as "En cola".
- [ ] Go online → it flips to "Enviado", toast shows, row + image land in Supabase.
- [ ] Confirm `reports_public` does NOT expose `contact_phone`.

---

## Phase 2 — Discovery ✅ COMPLETE

- [x] `ReportFeed`: newest-first list from `reports_public`, type filters, keyset "Ver más" pagination, Save-Data-aware thumbnails, realtime refresh
- [x] `/reportes/[id]` ReportDetail (RSC, `force-dynamic`, graceful "no encontrado")
- [x] `MapView` (MapLibre GL, dynamically imported): clustered color-coded markers, filter pills, NavigationControl + GeolocateControl, click cluster→zoom / point→detail
- [x] PMTiles protocol registered; basemap via `NEXT_PUBLIC_MAP_STYLE_URL` with blank fallback (markers still render)
- [x] Supabase Realtime subscription (feed + map refetch on change)
- [x] `BottomNav` (Reportar loud / Mapa / Reportes / Mis) global; FAB removed; routes `/mapa`, `/reportes`
- [x] `.env`: `NEXT_PUBLIC_MAP_STYLE_URL` (optional basemap)

### Review
- **Verified:** `tsc --noEmit` ✅ · `pnpm lint` ✅ · `pnpm build` ✅ (10 routes; `/reportes/[id]` dynamic; SW regenerated) · dev: `/` `/reportes` `/mapa` `/mis-reportes` `/reportar` all `200`; detail-miss renders "No se encontró el reporte" gracefully.
- **NOT verified (needs real browser + Supabase + a basemap):** live map render (clustering/markers/geolocate), realtime updates, feed data, Save-Data thumbnail drop, PMTiles basemap tiles.
- **Maps decision:** MapLibre GL directly (what mapcn wraps) — fewer deps, full control of PMTiles + clustering. Dynamically imported in MapView so SSR never touches `window`.
- **Markers:** circle-layer clustering colored by type (GPU, fast). Cluster count labels only render with a real basemap (need glyphs); list/feed is the accessible equivalent per DESIGN.md.

### Deferred
- VE `.pmtiles` basemap file + matching style (user supplies; env-configured).
- Drag-pin location selection on the report form (now that MapView exists, can wire in a follow-up).
- Cluster count labels in blank-fallback mode (needs a bundled glyph/font asset).
- next/image config for remote Supabase thumbnails (using plain `<img loading=lazy>` for now).

## Phase 2 — manual test checklist (browser + Supabase)
- [ ] Set `NEXT_PUBLIC_MAP_STYLE_URL` to a basemap style (e.g. self-hosted Protomaps/PMTiles); confirm tiles render under markers.
- [ ] Seed a verified report with coords → appears on `/mapa` as a colored marker and in `/reportes`.
- [ ] Toggle filter pills → markers + feed filter live.
- [ ] Insert/verify a report in Supabase → feed/map update via Realtime without reload.
- [ ] DevTools throttle to "Slow 3G" + Save-Data → feed thumbnails drop.

---

## Phase 3 — Moderation & Safety ✅ COMPLETE

> Model change (per request): **reports are public on insert** — no approval gate.
> Moderation is reactive.

- [x] `0001` updated: status `published` default, public-on-insert RLS, `reports_public` shows published+resolved
- [x] `0002_moderation.sql`: rate-limit trigger (IP-hash + client_uuid windows), public flagging + ≥3-flag auto-hide trigger, `moderators` allowlist + `is_moderator()`, moderator RLS (select/update reports, select/delete flags), `reports_moderation` view (security_invoker, exposes phone to mods only), `nearby_duplicates()` (pg_trgm + PostGIS), pgcrypto/pg_trgm extensions
- [x] Public flagging UI (`ReportActions` on detail) — anonymous, 1/browser via `client-id`
- [x] Moderator console `/admin`: Supabase Auth magic-link + moderator gate; queue tabs (Marcados/Publicados/Resueltos/Ocultos); row actions Resolver / Ocultar / Restaurar / Limpiar flags / Buscar duplicados → Merge
- [x] "Resuelto" badge on feed cards + detail
- [x] `getSupabase()` now persists session (magic-link survives reload/redirect)

### Review
- **Verified:** `tsc --noEmit` ✅ · `pnpm lint` ✅ · `pnpm build` ✅ (11 routes, `/admin` added) · dev: `/admin` `200` renders gate ("Configura Supabase" without env), detail graceful.
- **NOT verified (needs Supabase + auth + data):** flagging + auto-hide, rate-limit trigger, magic-link login, moderator actions, dedup RPC, all RLS. SQL written + reviewed only.
- **Security model:** public flag (anon) → community auto-hide at 3; resolve/remove/restore/merge = moderator, RLS-enforced (the `/admin` gate is UX only). `reports_moderation` is `security_invoker` so contact_phone reaches moderators only. No service key in the browser.
- **Decisions made:** rate limits 5/IP/10min + 3/client/1min; flag threshold 3; dedup = 150 m / 24 h / title-similarity 0.3, surfaced for manual merge (no auto-merge).

## Phase 3 — manual test checklist (Supabase)
- [ ] Apply `0001` + `0002`; `insert into moderators (user_id) values ('<your-auth-uid>')`.
- [ ] New report → visible immediately in `/reportes` (no approval).
- [ ] Flag a report from 3 different browsers → it disappears from public feed (auto-hidden).
- [ ] Sign in at `/admin` (magic link) as the moderator → see Marcados; Resolver/Ocultar/Restaurar work.
- [ ] Create 2 similar nearby reports → "Buscar duplicados" finds one → Merge hides it.
- [ ] Submit >5 reports fast → rate-limit error (report stays "Reintentará").
- [ ] Non-moderator signed-in user → "sin permisos"; anon `reports_public` still hides phone + hidden statuses.

---

## Phase 4 — Hardening & Launch ✅ COMPLETE (buildable parts)

- [x] **i18n ES/EN** — cookie-based, RSC-aware (`getServerT` server / `useT` client), typed dictionary (`en` mirrors `es`), header toggle, `<html lang>` + localized metadata
- [x] **PWA/SEO** — `robots.ts`, `sitemap.ts`, `/offline` page + Serwist fallback (precached), `metadataBase`
- [x] **a11y** — `npx @google/design.md lint` → **0 errors** (palette/contrast pass); 58 warnings are orphan-token spec hygiene only
- [x] **Open-source docs** — README (run/Supabase/deploy/i18n), CONTRIBUTING (bilingual), SECURITY, `.github` issue + PR templates
- [x] **Deploy guide** — Vercel + Cloudflare + env vars (in README)

### Review
- **Verified:** `tsc --noEmit` ✅ · `pnpm lint` ✅ · `pnpm build` ✅ (13 routes incl. offline/robots/sitemap) · dev: ES default + **EN via cookie** both render (`lang` + nav + form translated), `/offline` `/robots.txt` `/sitemap.xml` `200`.
- **NOT done — needs browser/accounts (now guides):** Lighthouse run + 2G perf budget, live Vercel/Cloudflare deploy, screen-reader pass. Documented in README + checklist below.
- **Tradeoff logged:** cookie i18n reads `cookies()` in the layout → pages render **dynamically** (ƒ) instead of static. Acceptable (content is dynamic anyway); runtime cache + `/offline` keep offline working. A `/[locale]` routing scheme (next-intl) would restore static — future option.
- **Icons:** kept SVG (no heavy `sharp` dep for one-time PNG gen). PNG/Apple-touch still a parked nicety.

## Phase 4 — manual checklist (browser/deploy)
- [ ] Lighthouse PWA + perf on throttled 2G (target installable, offline, good LCP/CLS).
- [ ] Screen-reader pass (VoiceOver/NVDA) on report form + feed + map list.
- [ ] Deploy to Vercel + Cloudflare; verify install prompt + offline reload + EN/ES toggle in prod.
- [ ] (Nicety) Generate PNG + Apple-touch icon set from `public/icon.svg`.

---

## Phase 5 — Hub reports: detail + sorted/paginated feed

Goal: hub (venezuela-ayuda) reports openable in detail from /reportes + map; hub
section sorted newest-first with pagination.

- [x] `hub-feed.ts`: sort `fetchHubReports` newest-first (createdAt desc); add
      `fetchHubReportById(id)` (scan recent pool — by-id endpoint omits hub type).
- [x] `report-detail-view.tsx`: fall back to hub when local id not found; hide
      ReportActions + ReportNotes for `source==="hub"` (they write Supabase by id);
      show "Ver fuente original" external link when `sourceUrl` present.
- [x] `public-report-card.tsx`: hub cards link internally to `/reportes/${id}`
      (was external/non-interactive). Keep hub badge.
- [x] `map-view.tsx`: navigate hub markers to `/reportes/${id}` (drop hub skip;
      also dropped the now-unused `source` GeoJSON feature property).
- [x] `report-feed.tsx`: client-slice pagination for hub section (visible + "Ver más").
- [x] `messages.ts`: add `detail.hubSource` (es/en).

### Review
- **Verified:** `tsc --noEmit` ✅ · `pnpm lint` ✅ · `pnpm build` ✅ (16 routes, `/reportes/[id]` compiles).
- **NOT verified (sandbox blocks port binding → no dev server / live network):** hub
  reports actually opening in detail, the source link, map hub-marker click-through, the
  pagination button. Needs a real browser + reachable hub API.
- **Decisions:** kept the hub a *separate* "Hub nacional" section (faithful to the
  request — sort+paginate within it, not merged into the local stream).
  Pagination is client-slice over a sorted pool (HUB_PAGE=10), not hub cursor paging.

### Phase 5b — map detail bug + summary popup
- **Bug:** map→detail failed ("No se encontró") for hub markers. Cause: detail
  resolved hub ids by scanning a recent pool (limit 100/type) but the map shows a
  bigger window (200/type), so deeper markers missed the scan. The feed (20/type)
  always sat inside the window, so it worked — hence "works from /reportes, not map".
- **Fix:** `fetchHubReportById` now hits `GET /api/v1/reports/{id}` directly. Its
  payload `{ report: { type, ... } }` carries the `type` discriminator (re-checked the
  OpenAPI — my earlier assumption was wrong), so any hub id resolves regardless of pool.
- **Feature:** clicking a marker now opens a MapLibre summary popup (icon+label, title,
  description, time+place, "Ver detalle" link) instead of navigating immediately. Built
  with `textContent` DOM nodes (hub title/desc are untrusted → no innerHTML). Works for
  local + hub. New i18n key `map.viewDetail`.
- **Verified:** `tsc --noEmit` ✅ · `pnpm lint` ✅ · `pnpm build` ✅. Live click-through
  still needs a real browser (sandbox blocks the dev server).
