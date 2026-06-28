# Security Policy · Política de seguridad

This app handles sensitive crisis data (missing persons, contact phone numbers).
Please report vulnerabilities responsibly.

## Reporting / Reportar

**Do not open a public issue for security problems.** Email the maintainers
(see the repo's contact / org page) with details and steps to reproduce. We aim
to acknowledge within a few days.

_No abras un issue público para problemas de seguridad. Escribe al equipo._

## Scope highlights

- **`contact_phone` is opt-in public.** A reporter who enters a phone has it
  shown on their published/resolved report (with a call button) — exposed
  intentionally through the `reports_public` view so people can reach them in a
  crisis. Direct anon `SELECT` of the column on the base `reports` table is
  revoked, so it's readable ONLY via that view (and the moderator view). Report
  any path that exposes a phone on a hidden (flagged/removed/merged) report, or
  any other column of the base table to anon.
- **RLS is the security boundary**, not the UI. Anonymous users may only INSERT
  reports (forced `published`) and flags. All moderator actions
  (resolve/remove/restore/merge) require an authenticated user in the
  `moderators` table.
- **No service-role key in the browser.** Only the public anon key ships to the
  client.
- **Rate limiting + flag auto-hide** are server-side (Postgres triggers). IPs
  are stored only as a salted hash.

If you find a way to read hidden reports, write as another user, bypass rate
limits, or escalate to moderator, that's in scope — please tell us.
