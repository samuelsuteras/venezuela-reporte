-- Reporte VE — moderation & safety layer (Phase 3). Reactive moderation on top
-- of public-on-insert reports: public flagging with an auto-hide threshold,
-- server-side rate limiting, moderator actions (resolve/remove/restore/merge),
-- and duplicate detection. Apply AFTER 0001_init.sql.

create extension if not exists pgcrypto;  -- digest() for ip hashing
create extension if not exists pg_trgm;   -- similarity() for dedup

-- ── Extra columns ────────────────────────────────────────────────────
alter table public.reports
  add column if not exists ip_hash text,                              -- rate limiting (never exposed)
  add column if not exists duplicate_of uuid references public.reports(id);

-- ── Rate limiting (per IP hash + per client) ─────────────────────────
-- Caps anonymous spam. IP comes from the forwarded header PostgREST exposes;
-- we store only a salted hash, never the raw IP.
create or replace function public.enforce_report_rate_limit()
returns trigger as $$
declare
  v_ip text;
  v_ip_count int;
  v_client_count int;
begin
  v_ip := split_part(
    coalesce(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ''),
    ',', 1);
  new.ip_hash := encode(
    digest(coalesce(nullif(v_ip, ''), new.client_uuid::text) || ':reporteve', 'sha256'),
    'hex');

  select count(*) into v_ip_count from public.reports
    where ip_hash = new.ip_hash and created_at > now() - interval '10 minutes';
  if v_ip_count >= 5 then
    raise exception 'rate_limit_exceeded'
      using errcode = 'check_violation', hint = 'Demasiados reportes. Espera unos minutos.';
  end if;

  select count(*) into v_client_count from public.reports
    where client_uuid = new.client_uuid and created_at > now() - interval '1 minute';
  if v_client_count >= 3 then
    raise exception 'rate_limit_exceeded'
      using errcode = 'check_violation', hint = 'Demasiados reportes seguidos. Espera un momento.';
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists reports_rate_limit on public.reports;
create trigger reports_rate_limit before insert on public.reports
  for each row execute function public.enforce_report_rate_limit();

-- ── Public flagging ──────────────────────────────────────────────────
alter table public.report_flags
  add column if not exists client_uuid uuid,
  add column if not exists reason text;

-- One flag per (report, client) so a single user can't pile on.
create unique index if not exists report_flags_unique
  on public.report_flags (report_id, client_uuid);

alter table public.report_flags enable row level security;

drop policy if exists report_flags_insert_anon on public.report_flags;
create policy report_flags_insert_anon on public.report_flags
  for insert to anon, authenticated
  with check (client_uuid is not null);

-- Auto-hide a report once it gathers enough distinct flags.
create or replace function public.apply_flag_threshold()
returns trigger as $$
declare v_count int;
begin
  select count(distinct client_uuid) into v_count
    from public.report_flags where report_id = new.report_id;
  if v_count >= 3 then
    update public.reports set status = 'flagged'
      where id = new.report_id and status = 'published';
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists report_flags_threshold on public.report_flags;
create trigger report_flags_threshold after insert on public.report_flags
  for each row execute function public.apply_flag_threshold();

-- ── Moderators ───────────────────────────────────────────────────────
create table if not exists public.moderators (
  user_id  uuid primary key references auth.users(id) on delete cascade,
  added_at timestamptz not null default now()
);
alter table public.moderators enable row level security;

-- A moderator may confirm their own membership (drives the admin UI gate).
drop policy if exists moderators_self on public.moderators;
create policy moderators_self on public.moderators
  for select to authenticated using (user_id = auth.uid());

create or replace function public.is_moderator()
returns boolean as $$
  select exists (select 1 from public.moderators where user_id = auth.uid());
$$ language sql stable security definer;

-- Moderators can read every report (incl. hidden + contact_phone) and update
-- status / duplicate_of. Reads/writes are RLS-gated to is_moderator().
drop policy if exists reports_select_mod on public.reports;
create policy reports_select_mod on public.reports
  for select to authenticated using (public.is_moderator());

drop policy if exists reports_update_mod on public.reports;
create policy reports_update_mod on public.reports
  for update to authenticated
  using (public.is_moderator()) with check (public.is_moderator());

drop policy if exists report_flags_select_mod on public.report_flags;
create policy report_flags_select_mod on public.report_flags
  for select to authenticated using (public.is_moderator());

drop policy if exists report_flags_delete_mod on public.report_flags;
create policy report_flags_delete_mod on public.report_flags
  for delete to authenticated using (public.is_moderator());

-- ── Moderation read surface ──────────────────────────────────────────
-- security_invoker so the base-table RLS applies: only moderators see rows
-- (and contact_phone). Adds the distinct-flag count.
create or replace view public.reports_moderation
with (security_invoker = true) as
  select
    r.id,
    r.client_uuid,
    r.type,
    r.title,
    r.description,
    st_y(r.location::geometry) as lat,
    st_x(r.location::geometry) as lng,
    r.address_text,
    r.status,
    r.contact_phone,
    r.image_paths,
    r.duplicate_of,
    r.created_at,
    (select count(distinct f.client_uuid)
       from public.report_flags f where f.report_id = r.id) as flag_count
  from public.reports r;

grant select on public.reports_moderation to authenticated;

-- ── Duplicate detection ──────────────────────────────────────────────
-- Likely duplicates of a report: same type, within 150 m and 24 h, similar
-- title. Surfaced in the admin so a moderator can merge — never auto-merged.
create or replace function public.nearby_duplicates(p_id uuid)
returns setof public.reports as $$
  select r.*
  from public.reports r, public.reports src
  where src.id = p_id
    and r.id <> p_id
    and r.type = src.type
    and r.status in ('published', 'flagged', 'resolved')
    and src.location is not null and r.location is not null
    and st_dwithin(r.location, src.location, 150)
    and r.created_at between src.created_at - interval '24 hours'
                         and src.created_at + interval '24 hours'
    and similarity(coalesce(r.title,''), coalesce(src.title,'')) > 0.3
  order by similarity(r.title, src.title) desc
  limit 10;
$$ language sql stable security definer;

revoke all on function public.nearby_duplicates(uuid) from anon;
grant execute on function public.nearby_duplicates(uuid) to authenticated;

-- Add a moderator (run once with your auth user id):
--   insert into public.moderators (user_id) values ('<auth-user-uuid>');
