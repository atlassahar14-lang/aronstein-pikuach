-- Run this in the Supabase SQL Editor for project knbbbrnwzbkywkrcponi

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null default '',
  role text not null default 'client' check (role in ('admin', 'client')),
  project_id text,
  created_at timestamptz default now()
);

create table if not exists public.app_data (
  id text primary key default 'main',
  projects jsonb not null default '[]'::jsonb,
  activity_log jsonb not null default '[]'::jsonb,
  updated_at timestamptz default now()
);

alter table public.app_data add column if not exists activity_log jsonb not null default '[]'::jsonb;

alter table public.profiles enable row level security;
alter table public.app_data enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.app_data to authenticated;

-- פונקציה שעוקפת RLS לבדיקת מנהל (מונעת infinite recursion במדיניות)
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to authenticated;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (auth.uid() = id);

drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin" on public.profiles
  for select to authenticated using (public.is_admin());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

drop policy if exists "profiles_insert_admin" on public.profiles;
create policy "profiles_insert_admin" on public.profiles
  for insert to authenticated with check (public.is_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (auth.uid() = id);

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin" on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "profiles_delete_admin" on public.profiles;
create policy "profiles_delete_admin" on public.profiles
  for delete to authenticated using (public.is_admin());

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

-- תיקון activity_log ישן שלא נשמר כמערך JSON
update public.app_data
set activity_log = '[]'::jsonb
where id = 'main'
  and (activity_log is null or jsonb_typeof(activity_log) <> 'array');

alter table public.app_data add column if not exists updated_at timestamptz default now();

-- שמירה אמינה מ-app (עוקף באגים/500 ב-PostgREST upsert?on_conflict=id)
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

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, role, project_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    case when new.email = 'atlassahar14@gmail.com' then 'admin' else 'client' end,
    new.raw_user_meta_data->>'project_id'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- התראות אימייל (Edge Functions + Resend)
-- =============================================================================
-- Secrets ב-Supabase Dashboard → Edge Functions → Secrets:
--   שם: RESEND_API_KEY   ערך: re_xxxxxxxx  (מ-https://resend.com/api-keys — ללא גרשיים/רווחים)
--   אופציונלי NOTIFY_FROM_EMAIL = onboarding@resend.dev
--   אחרי עדכון Secret חובה לפרוס מחדש: .\deploy-functions.ps1
--
-- פריסה:
--   supabase functions deploy notify-client-question --project-ref knbbbrnwzbkywkrcponi
--   supabase functions deploy notify-new-client --project-ref knbbbrnwzbkywkrcponi
--
-- notify-client-question — אימייל ל-atlassahar14@gmail.com כשלקוח שולח שאלה
-- notify-new-client — אימייל ל-atlassahar14@gmail.com כשנוצר לקוח חדש

-- =============================================================================
-- Storage: bucket "media" (Public) — העלאות עדכונים / אסמכתאות תשלום
-- =============================================================================
-- צור bucket בשם media ב-Dashboard → Storage (Public) לפני הרצת המדיניות.

drop policy if exists "media_auth_insert" on storage.objects;
drop policy if exists "media_admin_insert" on storage.objects;
drop policy if exists "media_auth_select" on storage.objects;
drop policy if exists "media_auth_update" on storage.objects;
drop policy if exists "media_admin_delete" on storage.objects;

-- מנהל בלבד: העלאת קבצים
create policy "media_admin_insert"
on storage.objects for insert to authenticated
with check (bucket_id = 'media' and public.is_admin());

-- משתמשים מחוברים: קריאת metadata
create policy "media_auth_select"
on storage.objects for select to authenticated
using (bucket_id = 'media');

-- מנהל בלבד: עדכון קובץ
create policy "media_auth_update"
on storage.objects for update to authenticated
using (bucket_id = 'media' and public.is_admin())
with check (bucket_id = 'media' and public.is_admin());

-- מנהל בלבד: מחיקה
create policy "media_admin_delete"
on storage.objects for delete to authenticated
using (bucket_id = 'media' and public.is_admin());
