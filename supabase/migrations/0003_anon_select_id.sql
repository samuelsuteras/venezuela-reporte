-- Reporte VE — let anonymous INSERT ... RETURNING work, safely.
--
-- PostgREST inserts with `Prefer: return=representation` (e.g. supabase-js
-- `.insert(...).select("id")`) do an INSERT ... RETURNING, which is subject to
-- SELECT RLS. Anon has no SELECT policy on `reports` (public reads go through
-- the reports_public view), so those inserts were rejected with 42501.
--
-- Fix: grant anon COLUMN-LEVEL select on every non-sensitive column (NOT
-- table-level — a table grant overrides column revokes), plus a row policy
-- limited to published/resolved. This covers `status` (needed to evaluate the
-- policy) and `id` (needed for RETURNING), while contact_phone and ip_hash are
-- never granted, so anon can never read them. Idempotent.

revoke select on public.reports from anon;
grant select (
  id, client_uuid, type, title, description, location,
  address_text, status, image_paths, duplicate_of, created_at, updated_at
) on public.reports to anon;

drop policy if exists reports_select_public on public.reports;
create policy reports_select_public on public.reports
  for select to anon
  using (status in ('published', 'resolved'));
