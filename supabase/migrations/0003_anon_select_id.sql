-- Reporte VE — let anonymous INSERT ... RETURNING work.
--
-- PostgREST inserts with `Prefer: return=representation` (e.g. supabase-js
-- `.insert(...).select("id")`) do an INSERT ... RETURNING, which is subject to
-- SELECT RLS. Anon has no SELECT policy on `reports` (public reads go through
-- the reports_public view), so those inserts were rejected with 42501.
--
-- Fix: allow anon to SELECT ONLY the `id` column of published/resolved reports.
-- contact_phone, ip_hash and every other column stay unreadable by anon
-- (column-level grant), so this leaks nothing. Idempotent.

revoke select on public.reports from anon;
grant select (id) on public.reports to anon;

drop policy if exists reports_select_public on public.reports;
create policy reports_select_public on public.reports
  for select to anon
  using (status in ('published', 'resolved'));
