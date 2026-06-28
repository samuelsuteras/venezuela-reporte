# Reporte VE

**Earthquake crisis-reporting PWA for Venezuela.** Report and find missing
people, needs, and hazards — on the slowest connection, offline, in Spanish (with
English). Open source, MIT licensed.

> Built for the slowest internet possible: offline-first reporting, a zero-byte
> system font, list-first UI, client-side image compression, and a single loud
> "Reportar" action. See [`DESIGN.md`](./DESIGN.md) and [`PLAN.md`](./PLAN.md).

## The 4-color taxonomy

Every report is one of four types — always shown as **color + icon + label**
(never color alone, for accessibility):

| 🔴 Emergencia | 🟡 Necesidad | 🔵 Información/Ayuda | ⚪ Resuelto |
|---|---|---|---|
| Trapped, injured, urgent missing | Water, food, medicine, shelter | Resources, safe zones, volunteers | Found, closed, handled |

Reports are **public the moment they're filed** (no approval gate). Moderation is
reactive: anyone can flag; 3 flags auto-hides a report; moderators
resolve/remove/merge.

## Stack

- **Next.js 16** (App Router, RSC) · **React 19** · **TypeScript** · **Tailwind v4**
- **Supabase** — Postgres + PostGIS, Storage, Realtime, RLS
- **MapLibre GL** + **PMTiles** (offline-friendly vector basemap)
- **Serwist** service worker (PWA) · **Dexie** (IndexedDB offline outbox)
- **pnpm**

## Run locally

```bash
pnpm install
cp .env.example .env.local   # optional — app runs without Supabase
pnpm dev                     # http://localhost:3000
```

The app works **without any backend**: reports queue in IndexedDB and show as
"En cola". Configure Supabase to enable sync, the public feed, and moderation.

### Connect Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Run the migrations (SQL editor or CLI) in order:
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_moderation.sql`
3. Copy your project URL + anon key into `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```
4. Make yourself a moderator (after signing in once at `/admin`):
   ```sql
   insert into public.moderators (user_id) values ('<your-auth-user-uuid>');
   ```

### Map basemap (optional)

Set `NEXT_PUBLIC_MAP_STYLE_URL` to a full MapLibre style — e.g. a self-hosted
[Protomaps](https://protomaps.com) `.pmtiles` of Venezuela with
`protomaps-themes-base`. Without it, the map shows markers on a blank background.

## Internationalization

Spanish is the default; an EN/ES toggle in the header persists the choice in a
cookie. Strings live in `src/lib/i18n/messages.ts` (the `en` map must mirror the
`es` keys — enforced by TypeScript). Server components translate via
`getServerT()`, client components via `useT()`.

## Scripts

| Command | What |
|---|---|
| `pnpm dev` | Dev server (webpack — see below) |
| `pnpm build` | Production build (+ service worker) |
| `pnpm lint` | ESLint |
| `pnpm bones:build` | Regenerate skeleton bones (needs a running dev server) |

> **Webpack, not Turbopack:** `@serwist/next` is webpack-only and conflicts with
> Next 16's default Turbopack, so the scripts pass `--webpack`. The offline
> service worker is core to this app, so we don't bet it on experimental
> `@serwist/turbopack`.

## Deploy

Target: **Vercel** (edge/CDN) behind **Cloudflare** (caching + reach in
Venezuela) on a custom domain.

1. Import the repo in Vercel; framework auto-detected.
2. Set env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `NEXT_PUBLIC_SITE_URL` (your domain), optional `NEXT_PUBLIC_MAP_STYLE_URL`.
3. Set the build command to `pnpm build` (webpack).
4. Point the domain through Cloudflare (proxied) for caching + access.

**Region:** `vercel.json` pins functions to `iad1` (US-East). Venezuela's
internet backhauls north through Miami, so US-East beats São Paulo in practice.
Create the **Supabase** project in **East US (North Virginia / `us-east-1`)** to
co-locate it with the functions — SSR hits the DB per request, so same-region
keeps that hop ~1–5 ms. (Supabase region is fixed at project creation.)

## Project conventions

See [`CLAUDE.md`](./CLAUDE.md) (workflow + atomic component architecture,
accessibility, boneyard skeletons, **comment every function** for contributors)
and [`DESIGN.md`](./DESIGN.md) (tokens, a11y checklist, low-bandwidth rules).

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md). Spanish-first project; PRs and issues
in Spanish or English welcome. Security issues: [`SECURITY.md`](./SECURITY.md).

## License

[MIT](./LICENSE) © Reporte VE contributors.
