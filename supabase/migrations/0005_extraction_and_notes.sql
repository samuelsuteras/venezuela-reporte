-- Reporte VE — structured extraction on reports/notes + anonymous notes.
-- Apply AFTER 0004. Extraction results land in `extracted` jsonb (written by the
-- /api/extract route via service role). Notes are anonymous, rate-limited by the
-- same ip_hash pattern as reports (0002), read publicly through a view that hides ip_hash.

-- ── Extraction columns on reports ────────────────────────────────────
alter table public.reports
  add column if not exists extracted    jsonb,
  add column if not exists extracted_at timestamptz;

-- ── Notes ────────────────────────────────────────────────────────────
do $$ begin
  create type note_status as enum ('visible','hidden');
exception when duplicate_object then null; end $$;

create table if not exists public.report_notes (
  id           uuid primary key default gen_random_uuid(),
  client_uuid  uuid not null unique,                 -- idempotency + extract-ping target
  report_id    uuid not null references public.reports(id) on delete cascade,
  body         text not null check (char_length(body) between 1 and 1000),
  extracted    jsonb,
  extracted_at timestamptz,
  ip_hash      text,                                 -- set by trigger, never exposed
  status       note_status not null default 'visible',
  created_at   timestamptz not null default now()
);
create index if not exists report_notes_report_idx on public.report_notes (report_id, created_at desc);

alter table public.report_notes enable row level security;

-- Rate limit: salted ip hash, cap per ip and per report. Mirrors enforce_report_rate_limit (0002).
create or replace function public.enforce_note_rate_limit()
returns trigger as $$
declare v_ip text; v_ip_count int; v_report_count int;
begin
  v_ip := split_part(
    coalesce(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ''), ',', 1);
  new.ip_hash := encode(
    digest(coalesce(nullif(v_ip, ''), new.client_uuid::text) || ':reporteve', 'sha256'), 'hex');

  select count(*) into v_ip_count from public.report_notes
    where ip_hash = new.ip_hash and created_at > now() - interval '10 minutes';
  if v_ip_count >= 10 then
    raise exception 'rate_limit_exceeded'
      using errcode = 'check_violation', hint = 'Demasiadas notas. Espera unos minutos.';
  end if;

  select count(*) into v_report_count from public.report_notes
    where report_id = new.report_id and ip_hash = new.ip_hash
      and created_at > now() - interval '1 minute';
  if v_report_count >= 3 then
    raise exception 'rate_limit_exceeded'
      using errcode = 'check_violation', hint = 'Espera un momento antes de otra nota.';
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists report_notes_rate_limit on public.report_notes;
create trigger report_notes_rate_limit before insert on public.report_notes
  for each row execute function public.enforce_note_rate_limit();

-- Anyone may post a note, but only as 'visible' (can't self-insert hidden).
drop policy if exists notes_insert_anon on public.report_notes;
create policy notes_insert_anon on public.report_notes
  for insert to anon, authenticated with check (status = 'visible');

-- Moderators can read all notes (incl. ip_hash/hidden) and hide/restore them.
drop policy if exists notes_select_mod on public.report_notes;
create policy notes_select_mod on public.report_notes
  for select to authenticated using (public.is_moderator());

drop policy if exists notes_update_mod on public.report_notes;
create policy notes_update_mod on public.report_notes
  for update to authenticated
  using (public.is_moderator()) with check (public.is_moderator());

-- Public read surface — visible notes only, ip_hash never exposed.
create or replace view public.report_notes_public as
  select id, report_id, body, extracted, created_at
  from public.report_notes
  where status = 'visible';
grant select on public.report_notes_public to anon, authenticated;

-- ── Recreate views to expose `extracted` (append-only; CREATE OR REPLACE can't reorder) ──
create or replace view public.reports_public as
  select
    id, type, title, description,
    st_y(location::geometry) as lat,
    st_x(location::geometry) as lng,
    address_text, status, image_paths, created_at,
    contact_phone, extracted
  from public.reports
  where status in ('published', 'resolved');
grant select on public.reports_public to anon, authenticated;

create or replace view public.reports_moderation
with (security_invoker = true) as
  select
    r.id, r.client_uuid, r.type, r.title, r.description,
    st_y(r.location::geometry) as lat,
    st_x(r.location::geometry) as lng,
    r.address_text, r.status, r.contact_phone, r.image_paths,
    r.duplicate_of, r.created_at, r.extracted,
    (select count(distinct f.client_uuid)
       from public.report_flags f where f.report_id = r.id) as flag_count
  from public.reports r;
grant select on public.reports_moderation to authenticated;
