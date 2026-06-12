-- =============================================================================
-- Supabase RLS migration — פרויקט knbbbrnwzbkywkrcponi
-- הרץ ב-SQL Editor (Safe to re-run)
-- מכסה: app_data RLS (#1), save_app_data RPC (#2), Storage media (#4), profiles (#5)
-- =============================================================================

-- ----- #1 app_data: RLS policies (select / insert / update / delete) -----
alter table public.app_data enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.app_data to authenticated;

drop policy if exists "app_data_select_auth" on public.app_data;
create policy "app_data_select_auth" on public.app_data
  for select to authenticated using (true);

drop policy if exists "app_data_insert_auth" on public.app_data;
create policy "app_data_insert_auth" on public.app_data
  for insert to authenticated with check (true);

drop policy if exists "app_data_update_auth" on public.app_data;
create policy "app_data_update_auth" on public.app_data
  for update to authenticated using (true) with check (true);

drop policy if exists "app_data_delete_admin" on public.app_data;
create policy "app_data_delete_admin" on public.app_data
  for delete to authenticated using (public.is_admin());

-- תיקון activity_log שלא נשמר כמערך
update public.app_data
set activity_log = '[]'::jsonb
where id = 'main'
  and (activity_log is null or jsonb_typeof(activity_log) <> 'array');

alter table public.app_data add column if not exists updated_at timestamptz default now();

-- ----- #2 save_app_data RPC (security definer, authenticated only) -----
create or replace function public.save_app_data(p_projects jsonb, p_activity_log jsonb default '[]'::jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_activity jsonb;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  v_activity := coalesce(p_activity_log, '[]'::jsonb);
  if jsonb_typeof(v_activity) <> 'array' then
    v_activity := '[]'::jsonb;
  end if;

  insert into public.app_data (id, projects, activity_log, updated_at)
  values (
    'main',
    coalesce(p_projects, '[]'::jsonb),
    v_activity,
    now()
  )
  on conflict (id) do update set
    projects = excluded.projects,
    activity_log = excluded.activity_log,
    updated_at = now();
end;
$$;

grant execute on function public.save_app_data(jsonb, jsonb) to authenticated;

-- ----- #4 Storage bucket "media" + policies (admin upload, auth read) -----
insert into storage.buckets (id, name, public, file_size_limit)
values ('media', 'media', true, 20971520)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit;

drop policy if exists "media_auth_insert" on storage.objects;
drop policy if exists "media_admin_insert" on storage.objects;
drop policy if exists "media_auth_select" on storage.objects;
drop policy if exists "media_auth_update" on storage.objects;
drop policy if exists "media_admin_delete" on storage.objects;

create policy "media_admin_insert"
on storage.objects for insert to authenticated
with check (bucket_id = 'media' and public.is_admin());

create policy "media_auth_select"
on storage.objects for select to authenticated
using (bucket_id = 'media');

create policy "media_auth_update"
on storage.objects for update to authenticated
using (bucket_id = 'media' and public.is_admin())
with check (bucket_id = 'media' and public.is_admin());

create policy "media_admin_delete"
on storage.objects for delete to authenticated
using (bucket_id = 'media' and public.is_admin());

-- ----- #5 profiles: admin insert + client insert guard + role lock trigger -----
alter table public.profiles enable row level security;

grant select, insert, update, delete on public.profiles to authenticated;

-- is_admin() required by policies below (run full supabase-setup.sql if missing)
-- create or replace function public.is_admin() ...

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (
    auth.uid() = id
    and (
      role = 'client'
      or email = 'atlassahar14@gmail.com'
      or public.is_admin()
    )
  );

drop policy if exists "profiles_insert_admin" on public.profiles;
create policy "profiles_insert_admin" on public.profiles
  for insert to authenticated with check (public.is_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (auth.uid() = id);

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin" on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.profiles_lock_own_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() = old.id and new.role is distinct from old.role then
    new.role := old.role;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_lock_own_role on public.profiles;
create trigger profiles_lock_own_role
  before update on public.profiles
  for each row execute function public.profiles_lock_own_role();

-- אימות
select 'app_data policies' as check_name, count(*) as policy_count
from pg_policies where schemaname = 'public' and tablename = 'app_data';

select 'storage media policies' as check_name, count(*) as policy_count
from pg_policies where schemaname = 'storage' and tablename = 'objects'
  and policyname like 'media_%';

select 'save_app_data exists' as check_name,
  exists(select 1 from pg_proc where proname = 'save_app_data') as ok;

select id, public, file_size_limit from storage.buckets where id = 'media';
