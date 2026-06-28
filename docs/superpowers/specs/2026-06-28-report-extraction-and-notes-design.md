# Report Data Extraction + Notes — Design

**Date:** 2026-06-28
**Status:** Approved (design), pending implementation plan
**Scope:** One implementation cycle. Two coupled features sharing one extraction pipeline.

## Goal

1. **Extract structured data** from a report's free-text `description` — names, cédula (DNI), phone, address, links — so reports become searchable, matchable, and de-duplicable.
2. **Notes on reports** — let users leave anonymous notes on a report. Notes run through the same extractor (links/phones in a note get surfaced too).

Both serve one outcome: turn unstructured crisis text into organized, actionable data.

## Decisions (locked)

| Decision | Choice |
|---|---|
| Note authors | **Anonymous** (anyone), like reports. Anti-spam via the existing `ip_hash` rate-limit trigger. |
| Extracted-field visibility | **Public** — shown as chips on the public report. |
| Cédula display | **Full public from day one** (`EXTRACT_CEDULA_PUBLIC_FULL=true` default). Masking code kept behind the flag for one-flip reversibility if exposure ever becomes a problem. |
| LLM providers | Groq (primary), Gemini Flash, OpenRouter `:free`, Cerebras — round-robin, circuit-broken. |
| Extraction strategy | **Hybrid** — regex for cédula/phone/link (deterministic, free, offline-capable); LLM for names/address. |

### Privacy note (cédula)
The raw description is already public via `reports_public`, so structured extraction publishes no *new* data — but it makes cédula harvestable at scale. Mitigation baked in: public render masks the middle digits; full value lives only in `extracted` (mod-visible) and an opt-in reveal. `EXTRACT_CEDULA_PUBLIC_FULL` config flag (default `false`) unmasks if the operator decides utility outweighs exposure.

## Architecture

### Why hybrid (vs pure-LLM / pure-regex)
- Cédula, phone, URL are rigidly formatted → regex extracts them perfectly, for free, instantly, and **even with zero LLM keys or all breakers open**. LLMs *lose* recall on exact digit strings.
- Names and messy addresses are fuzzy → that's the LLM's job.
- Net: best accuracy, lowest free-quota burn, graceful degradation (LLM down ⇒ still get cédula/phone/links).

### Module layout

```
src/lib/ai/                      # LLM rotator — ported & trimmed from market-chat
  providers.ts                   # Groq, Cerebras, Gemini Flash, OpenRouter(:free) as tier-1
  router.ts                      # pickTier1(): round-robin, skip open breakers
  circuit-breaker.ts             # in-memory: 3 fails/60s -> open 5min, half-open probe

src/lib/extract/
  patterns.ts                    # pure regex + normalizers (cedula, phone, url). Isomorphic, tested.
  patterns.test.ts               # VE-specific edge cases
  llm.ts                         # extractFuzzy(text) -> {names[], addresses[]} via generateObject
  extract.ts                     # extractAll(text) -> Extracted (regex ∪ llm)
  types.ts                       # Extracted, normalize helpers

src/app/api/extract/route.ts     # POST {kind,id} -> run extractAll, write back via service role
```

### LLM rotator (ported from `samuelsuteras/market-chat`)
Verbatim-port the proven pattern:
- `circuit-breaker.ts` — copy as-is (process-local in-memory breaker).
- `router.ts` — `pickTier1()` round-robins `TIER_1_ORDER`, skips open breakers, falls back to first if all open.
- `providers.ts` — same `lazy()`/`createGroq`/`createOpenAICompatible`/`createGoogleGenerativeAI` shape. Add OpenRouter via `createOpenAICompatible({ baseURL: "https://openrouter.ai/api/v1" })` with a `:free` model id. Missing key ⇒ that provider drops out of `TIER_1_ORDER` (don't add it), not a hard crash.

Call site wraps the model with breaker bookkeeping:
```
const { key, model } = pickTier1();
try { const r = await generateObject({ model, schema, prompt }); breaker.recordSuccess(key); return r; }
catch (e) { breaker.recordFailure(key); /* retry next provider, bounded */ }
```

### Extraction schema (permissive-then-normalize)
market-chat's hard lesson: free LLMs emit sloppy JSON. Validate loose, normalize after.
```ts
// llm.ts
const fuzzySchema = z.object({
  names: z.array(z.string()).optional(),       // person names only
  addresses: z.array(z.string()).optional(),
});
// normalize: trim, dedup case-insensitively, drop empties, cap array length
```
```ts
// types.ts
interface Extracted {
  cedulas: string[];     // normalized "V-12345678"
  phones: string[];      // E.164-ish "+58414XXXXXXX" + display form
  links: string[];       // validated absolute URLs
  names: string[];       // from LLM
  addresses: string[];   // from LLM
}
```

### Regex patterns (`patterns.ts`)
- **Cédula:** `/\b([VEJPGvejpg])-?\.?\s?(\d{1,2}\.?\d{3}\.?\d{3})\b/` → normalize to `PREFIX-DIGITS` (strip dots/spaces, uppercase prefix). Covers `V-12345678`, `V12.345.678`, `E-1234567`. (`J`/`G`/`P` = RIF/passport; keep, mods can ignore.)
- **Phone (VE):** mobile prefixes `0412 0414 0416 0424 0426`, landline `02xx`, intl `+58`. `/(?:\+?58\s?)?(?:0?4(?:12|14|16|24|26)|02\d\d)[\s-]?\d{3}[\s-]?\d{4}/` → normalize to `+58…`. Keep a display form for `CallButton`.
- **URL:** `/\bhttps?:\/\/[^\s<>"')]+/gi` plus bare `www.` → prefix `https://`. Validate via `new URL()`; drop invalid.

All three run client-side too (optimistic chips before the LLM pass returns).

### Trigger flow (offline-first aware)
The client syncs **directly** to Supabase — no Next.js server in the insert path. So:
1. **Report:** after a successful `flushOutbox()` sync, fire-and-forget `POST /api/extract { kind:'report', id: remoteId }`.
2. **Note:** after a note insert succeeds, fire-and-forget `POST /api/extract { kind:'note', id }`.
3. **On-demand:** `/admin` report detail has a **"Re-extraer"** button → `POST .../extract?force=1`.
4. **Optimistic:** regex pass may run client-side immediately so cédula/phone/link chips show before the server round-trip.

`/api/extract` (server-only, service-role write):
- Looks up the row by `kind`+`id`. 404 if absent.
- Skips if `extracted_at` is set (idempotent) unless `?force=1`.
- Runs `extractAll(text)`; writes `extracted` + `extracted_at`.
- IP rate-limited (cap calls/min) so the endpoint can't be used to burn free LLM quota.
- Never required for the app to function — failures are logged, report still displays raw text.

## Data model — migration `0005_extraction_and_notes.sql`

```sql
-- Extraction results on reports
alter table public.reports add column if not exists extracted    jsonb;
alter table public.reports add column if not exists extracted_at timestamptz;

-- Notes
create type note_status as enum ('visible','hidden');

create table public.report_notes (
  id         uuid primary key default gen_random_uuid(),
  report_id  uuid not null references public.reports(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 1000),
  extracted  jsonb,
  ip_hash    text,                              -- set by trigger, never exposed
  status     note_status not null default 'visible',
  created_at timestamptz not null default now()
);
create index report_notes_report_idx on public.report_notes (report_id, created_at);

alter table public.report_notes enable row level security;

-- anon may insert (rate-limited by reused BEFORE INSERT ip_hash trigger)
create policy notes_insert_anon on public.report_notes
  for insert to anon, authenticated with check (true);

-- public reads only visible notes; never exposes ip_hash (column-level grant)
create policy notes_select_visible on public.report_notes
  for select to anon, authenticated using (status = 'visible');

-- moderators can hide/restore
create policy notes_update_mod on public.report_notes
  for update to authenticated using (public.is_moderator());

-- reuse the existing ip_hash rate-limit trigger pattern from 0002
create trigger report_notes_ratelimit before insert on public.report_notes
  for each row execute function public.enforce_note_rate_limit();  -- mirrors report limiter
```

- `reports_public` view: add `extracted` (stored **full**; masking happens app-side in `feed.ts`, not in SQL — keeps it one config flag).
- `reports_moderation` view: add `extracted` (full) + notes are read directly with `ip_hash` for mods.
- Public notes read surface excludes `ip_hash` via column grant (mirrors how `contact_phone` is gated).

## Components (atomic design)

```
molecules/
  extracted-chips.tsx     # public: Nombres / Cédula / Teléfono / Dirección / Enlaces
                          #   each = color + icon + Spanish label (never color-only)
                          #   phones -> CallButton; links -> rel="noopener nofollow" external
  note-form.tsx           # textarea <=1000, aria-live status, aria-invalid on error, clear-on-keystroke
  note-item.tsx           # one note + its extracted chips
organisms/report/
  report-notes.tsx        # list (live) + form; mounted in report-detail-view.tsx
organisms/admin/
  (extend) report detail  # raw extracted JSON, "Re-extraer", note hide/restore
ui/loading-bones.tsx
  + extractedChips bone   # BoneSkeleton while LLM pass pending
  + noteList bone
```

- **A11y:** chips carry icon+label not color alone; touch targets ≥44px; `aria-live="polite"` on note-submit + extraction status; external links flagged to screen readers; reduced-motion honored.
- **Client/server:** `report-notes`/`note-form` are `"use client"` (form state, live query). `extracted-chips` is presentational → can render in the RSC detail view from server-fetched `extracted`.
- No barrel exports. TSDoc on every exported fn/component.

## Data access
- `src/lib/notes.ts` — `addNote(reportId, body)` (insert + fire `/api/extract`), `useNotes(reportId)` live read.
- `src/lib/feed.ts` — `PublicReport` gains `extracted: Extracted | null`; mapper reads the new view column; cédula masking applied here per flag.

## Config / env (all optional)
```
GROQ_API_KEY=
CEREBRAS_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
OPENROUTER_API_KEY=
OPENROUTER_MODEL=            # default a :free id
EXTRACT_CEDULA_PUBLIC_FULL=true   # full cédula public from day one; set false to mask
SUPABASE_SERVICE_ROLE_KEY=   # server-only, for /api/extract write-back
```
No keys at all ⇒ regex-only extraction; everything still works.

## Testing
- `patterns.test.ts` — cédula (`V-`, `V12.345.678`, `E-`, RIF), phones (each mobile prefix, `+58`, landline, with/without separators), URLs (bare `www`, trailing punctuation, invalid rejected).
- `llm.ts` normalize unit test — feeds a deliberately sloppy object (extra keys, whitespace, dupes) → asserts clean `Extracted`.
- Manual: submit a report with all five entity types + a note with a link → chips appear; kill all LLM keys → cédula/phone/link chips still appear.

## Out of scope (YAGNI — add when needed)
- Threaded/nested notes (flat list first).
- Turnstile (reuse `ip_hash` trigger).
- Supabase Edge Function for extraction (client-ping is simpler; revisit if client-trigger proves unreliable).
- Cross-report entity matching / dedup UI (extraction makes it *possible*; building the matcher is a later cycle).

## File-change summary

| Action | Path |
|---|---|
| add | `src/lib/ai/{providers,router,circuit-breaker}.ts` |
| add | `src/lib/extract/{patterns,patterns.test,llm,extract,types}.ts` |
| add | `src/app/api/extract/route.ts` |
| add | `src/lib/notes.ts` |
| add | `src/components/molecules/{extracted-chips,note-form,note-item}.tsx` |
| add | `src/components/organisms/report/report-notes.tsx` |
| add | `supabase/migrations/0005_extraction_and_notes.sql` |
| edit | `src/lib/sync.ts` (post-sync extract ping) |
| edit | `src/lib/feed.ts` (`extracted` field + cédula mask) |
| edit | `src/components/organisms/report/report-detail-view.tsx` (chips + notes) |
| edit | `src/components/organisms/admin/*` (re-extract, note moderation) |
| edit | `src/components/ui/loading-bones.tsx` (+2 bones) + `src/app/dev/bones/page.tsx` |
| edit | `.env.example`, `package.json` (ai-sdk deps) |
