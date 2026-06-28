# PLAN.md — Reporte VE

> Earthquake crisis-reporting PWA for Venezuela. Report and find missing people,
> needs, hazards, and help — on the slowest connection, offline, in Spanish.
> Open source. Read alongside `CLAUDE.md` (workflow + conventions) and
> `DESIGN.md` (visual + a11y spec).

---

## 1. Mission & Principles

Help people in a disaster **file a report in seconds and see what's near them** —
even with no signal, on a cracked low-end phone, one-handed, in panic.

Design tenets (every decision serves these, in order):
1. **Works offline / on 2G.** Reporting must never require a live connection.
2. **Fast & legible.** Instant first paint, oversized targets, hard contrast.
3. **Trustworthy.** Sensitive data (missing persons). Moderated, rate-limited, honest about sync state.
4. **Accessible.** WCAG 2.2 AA; color never the only signal (see `DESIGN.md § Accessibility`).
5. **Simple to contribute to.** Open source; every function documented (`CLAUDE.md § 4`).

---

## 2. The 4-Color Taxonomy (core data vocabulary)

| Color | `report_type` | Label (ES) | Examples |
|---|---|---|---|
| 🔴 Red | `emergency` | **Emergencia** | atrapados, heridos, persona desaparecida urgente |
| 🟡 Amber | `need` | **Necesidad** | agua, comida, medicina, refugio |
| 🔵 Blue | `info` | **Información / Ayuda** | recursos, zonas seguras, voluntarios |
| ⚪ Neutral | `resolved` | **Resuelto** | encontrado, cerrado, atendido |

Rule: **color + icon + Spanish label, always together.** Tokens in `DESIGN.md`.

---

## 3. Architecture (decided)

```
                 ┌─────────────────────────────────────────────┐
   PWA (client)  │  Next 16 App Router · RSC · TS · Tailwind    │
                 │  shadcn (base-ui) · MapLibre (mapcn)         │
                 │                                             │
                 │  ┌──────────────┐   Serwist service worker  │
   offline path  │  │ Dexie outbox │   (precache shell+tiles,  │
                 │  │  (IndexedDB) │    Background Sync)        │
                 │  └──────┬───────┘                           │
                 └─────────┼───────────────────────────────────┘
                           │ flush when online
                           ▼
                 ┌─────────────────────────────────────────────┐
   Supabase      │  Postgres + PostGIS (geo queries)           │
                 │  Storage (compressed images)                │
                 │  Realtime (live verified feed)              │
                 │  RLS (public reads verified; admin writes)  │
                 └─────────────────────────────────────────────┘

   Hosting: Vercel (edge/CDN) + Cloudflare proxy + custom domain
```

**Stack**
- **Framework:** Next 16 App Router, React Server Components, TypeScript, Tailwind, shadcn/base-ui, `pnpm`.
- **Backend:** Supabase — Postgres + **PostGIS**, Storage, Realtime, Row-Level Security.
- **Maps:** mapcn → **MapLibre GL JS**, free/self-hostable vector tiles, color-coded clustered markers.
- **Offline:** **Serwist** service worker + **Dexie** IndexedDB outbox + Background Sync.
- **Images:** client-side compression (`browser-image-compression` / canvas) → ~50–100KB WebP.
- **Hosting:** Vercel + Cloudflare proxy (VE reachability/caching) + custom domain.
- **i18n:** Spanish default, English toggle. `next-intl` (or lightweight dictionary) — start with a flat ES/EN JSON.

**Component layers:** atomic design per `DESIGN.md § Component Architecture`.

---

## 4. Data Model (Supabase / PostGIS)

```sql
-- reports: the core table
create table reports (
  id            uuid primary key default gen_random_uuid(),
  client_uuid   uuid not null,                 -- dedup across offline retries
  type          report_type not null,          -- enum: emergency|need|info|resolved
  title         text not null check (char_length(title) between 3 and 120),
  description   text check (char_length(description) <= 2000),
  location      geography(Point, 4326),        -- nullable: report without GPS allowed
  address_text  text,                           -- human address / reference point
  status        report_status not null default 'pending', -- pending|verified|flagged|resolved
  contact_phone text,                            -- optional, NEVER public
  image_paths   text[] default '{}',            -- Supabase Storage keys
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index reports_location_gix on reports using gist (location);
create index reports_type_status_idx on reports (type, status);
create unique index reports_client_uuid_uidx on reports (client_uuid); -- idempotent submit

create type report_type   as enum ('emergency','need','info','resolved');
create type report_status as enum ('pending','verified','flagged','resolved');

create table report_flags (
  id         uuid primary key default gen_random_uuid(),
  report_id  uuid references reports(id) on delete cascade,
  reason     text,
  created_at timestamptz default now()
);
```

**RLS sketch**
- `select`: public sees `status in ('verified','resolved')`; `contact_phone` never selected by anon (column-level or a `reports_public` view that omits it).
- `insert`: anon allowed (rate-limited via edge function / IP+client_uuid), `status` forced to `pending`.
- `update`/moderation: authenticated admin role only.

**Geo reads:** nearby feed = `ST_DWithin(location, :point, :meters)` ordered by distance; map = bbox query on the GiST index.

---

## 5. Key Flows

**Submit (works fully offline)**
1. Pick type (4 big `type-option-*` tiles) → title → description.
2. Photo (optional): camera capture → compress to WebP client-side.
3. Location: `navigator.geolocation` pin **or** drag marker on map **or** type address. All optional but encouraged.
4. Write to Dexie outbox → optimistic card in "Mi reporte" with `Pendiente` badge.
5. Background Sync flushes to Supabase when online (idempotent via `client_uuid`).

**Read (low-bandwidth default = list-first)**
- Landing = text feed, paginated slim JSON, nearest-first. Map is a separate tab, tiles load on demand.
- `Save-Data`/2G → drop thumbnails to tap-to-load, skip map autoload.

**Moderate (`/admin`)**
- Pending queue → approve / flag / merge duplicates / mark resolved. Auth-gated.

---

## 6. Milestones

### Phase 0 — Foundation
- [ ] Scaffold Next 16 + TS + Tailwind + shadcn/base-ui + `pnpm`.
- [ ] Atomic folder structure per `DESIGN.md § Component Architecture` (no barrels).
- [ ] Tailwind theme from `DESIGN.md` tokens (colors, type scale, spacing, radii).
- [ ] BoneSkeleton + boneyard pipeline wired (`CLAUDE.md § 2`).
- [ ] PWA manifest + Serwist service worker (app-shell precache) + installable.
- [ ] `lang="es"`, skip link, `#main`, base landmarks.

### Phase 1 — Reporting MVP
- [ ] Supabase project: schema, enums, PostGIS, RLS, Storage bucket.
- [ ] `ReportForm`: 4-type selector, title/description, validation (a11y errors).
- [ ] Photo upload + client-side WebP compression.
- [ ] `LocationPicker`: GPS + drag-pin + address fallback.
- [ ] Dexie outbox + Background Sync (idempotent submit, optimistic UI).
- [ ] "Mi reporte" view with live sync-state badges.
- [ ] Offline banner + sync toast (aria-live).

### Phase 2 — Discovery
- [ ] `ReportFeed`: nearby list, paginated, type filters, `Save-Data` aware.
- [ ] `ReportDetail` page (RSC).
- [ ] `MapView` (MapLibre): clustered color markers, filter pills, locate button, offline tile cache.
- [ ] Realtime feed updates for verified reports.

### Phase 3 — Trust & Moderation
- [ ] `/admin` auth + moderation queue (approve/flag/merge/resolve).
- [ ] Rate limiting (IP + client_uuid), honeypot, basic spam heuristics.
- [ ] Duplicate detection assist (same type + near location + similar title).

### Phase 4 — Hardening & Launch
- [ ] Lighthouse: PWA installable, offline, perf budget on throttled 2G.
- [ ] a11y audit (keyboard, screen reader, grayscale, contrast lint).
- [ ] EN/ES i18n complete.
- [ ] Deploy Vercel + Cloudflare + domain; load test.
- [ ] `README` + `CONTRIBUTING` + issue templates (open-source onboarding).

---

## 7. Low-Bandwidth & Offline Strategy

(Canonical detail in `DESIGN.md § Low-Bandwidth & Offline Design`.)
- System font (0 font bytes) · list-first · `Save-Data`/`navigator.connection` aware.
- Client-side image compression before network or outbox.
- Serwist precache (shell + tiles); Dexie outbox + Background Sync.
- Slim paginated JSON; RSC to minimize client JS; boneyard skeletons (no CLS).

---

## 8. Security & Trust

- Sensitive data (missing persons, phones). `contact_phone` **never** exposed to anon reads.
- RLS: anon insert (forced `pending`), public read of verified only, admin-only moderation.
- Rate limit + honeypot to blunt spam/misinfo on an emotionally charged surface.
- No accounts required to report (lowest crisis friction); optional phone for follow-up only.
- HTTPS only; minimal PII retention; clear data-handling note in the UI + README.

---

## 9. Open-Source Notes

- Every function documented (TSDoc) per `CLAUDE.md § 4` — strangers must be able to contribute.
- `README` (run locally, env vars, Supabase setup), `CONTRIBUTING`, `LICENSE` (MIT or AGPL — decide), issue/PR templates.
- `.env.example` with Supabase + map tile vars. No secrets committed.
- Spanish-first docs (contributors are likely VE/LatAm devs), English secondary.

---

## 10. Phase-2+ Ideas (NOT in MVP — parked)

- **SMS / USSD fallback** for users with no smartphone/data (Twilio or local gateway) — file a report by text.
- **Verified-volunteer / NGO badges** + trusted-source fast-track moderation.
- **Smart dedup & clustering** of reports about the same person/place.
- **Shelter & resource directory** (curated `info` reports).
- **Shareable report cards** (deep links) for spreading a missing-person notice.
- **Export / API** for relief organizations and authorities.
- **Multi-event support** (reuse the platform for future disasters).

---

## Decisions Log

- **License: MIT.** ✅
- **Vector tiles: Protomaps / PMTiles.** ✅ Self-hosted single `.pmtiles` file, no API key, offline-friendly. Clip to Venezuela to keep the file small.
- i18n lib: `next-intl` vs hand-rolled dictionary — start hand-rolled, upgrade if needed. _(open)_
