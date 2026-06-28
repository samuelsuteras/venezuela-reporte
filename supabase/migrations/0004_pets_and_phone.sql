-- Reporte VE — add the "pet" (mascotas) report type, and expose contact_phone
-- on the public view so reporters can opt in to being called.
--
-- contact_phone is shown on public reports ONLY through reports_public (a
-- definer view, published/resolved rows). Direct anon SELECT of the column on
-- the base table is still revoked (see 0003), so it's a deliberate, narrow
-- exposure of a field the reporter chose to provide.

alter type report_type add value if not exists 'pet';

-- New column appended at the end (CREATE OR REPLACE VIEW can't reorder).
create or replace view public.reports_public as
  select
    id, type, title, description,
    st_y(location::geometry) as lat,
    st_x(location::geometry) as lng,
    address_text, status, image_paths, created_at,
    contact_phone
  from public.reports
  where status in ('published', 'resolved');

grant select on public.reports_public to anon, authenticated;
