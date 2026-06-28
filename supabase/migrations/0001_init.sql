-- Reporte VE — core schema. Apply with the Supabase SQL editor or CLI.
-- See PLAN.md § 4 (data model) and § 8 (security). Anonymous reporting with
-- moderation: anyone may INSERT a 'pending' report; the public only READS
-- verified/resolved rows through a view that omits contact_phone.

create extension if not exists postgis;

-- ── Enums ────────────────────────────────────────────────────────────
do $$ begin
  create type report_type as enum ('emergency','need','info','resolved');
exception when duplicate_object then null; end $$;

-- Reports are PUBLIC the moment they're filed (no approval gate). Moderation is
-- reactive: 'published' (default, public) · 'resolved' (public, marked handled)
-- · 'flagged' / 'removed' / 'merged' (hidden). See 0002_moderation.sql.
do $$ begin
  create type report_status as enum ('published','resolved','flagged','removed','merged');
exception when duplicate_object then null; end $$;

-- ── Core table ───────────────────────────────────────────────────────
create table if not exists public.reports (
  id            uuid primary key default gen_random_uuid(),
  client_uuid   uuid not null unique,                       -- idempotency key
  type          report_type not null,
  title         text not null check (char_length(title) between 3 and 120),
  description   text check (char_length(description) <= 2000),
  location      geography(Point, 4326),
  address_text  text,
  status        report_status not null default 'published',
  contact_phone text,                                       -- NEVER exposed publicly
  image_paths   text[] not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists reports_location_gix on public.reports using gist (location);
create index if not exists reports_type_status_idx on public.reports (type, status);
create index if not exists reports_created_idx on public.reports (created_at desc);

create or replace function public.touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists reports_touch on public.reports;
create trigger reports_touch before update on public.reports
  for each row execute function public.touch_updated_at();

-- ── Moderation flags ─────────────────────────────────────────────────
create table if not exists public.report_flags (
  id         uuid primary key default gen_random_uuid(),
  report_id  uuid references public.reports(id) on delete cascade,
  reason     text,
  created_at timestamptz not null default now()
);

-- ── Row-Level Security ───────────────────────────────────────────────
alter table public.reports enable row level security;

-- Anyone may file a report; it's published immediately. No anon UPDATE/DELETE/
-- SELECT on the base table (it holds contact_phone). Moderation policies for
-- authenticated moderators live in 0002_moderation.sql.
drop policy if exists reports_insert_anon on public.reports;
create policy reports_insert_anon on public.reports
  for insert to anon, authenticated
  with check (status = 'published');

-- Public-safe read surface: verified/resolved rows only, NO contact_phone,
-- location pre-split into lat/lng. SECURITY DEFINER (default) so it reads the
-- base table regardless of RLS while exposing only these columns.
create or replace view public.reports_public as
  select
    id,
    type,
    title,
    description,
    st_y(location::geometry) as lat,
    st_x(location::geometry) as lng,
    address_text,
    status,
    image_paths,
    created_at
  from public.reports
  where status in ('published','resolved');

grant select on public.reports_public to anon, authenticated;

-- ── Storage: compressed report images ────────────────────────────────
insert into storage.buckets (id, name, public)
  values ('report-images','report-images', true)
  on conflict (id) do nothing;

drop policy if exists report_images_insert on storage.objects;
create policy report_images_insert on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'report-images');

drop policy if exists report_images_read on storage.objects;
create policy report_images_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'report-images');
