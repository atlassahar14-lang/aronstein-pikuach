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
--   RESEND_API_KEY = re_xxxxxxxx
--   NOTIFY_FROM_EMAIL = onboarding@resend.dev   (או דומיין מאומת משלך)
--
-- פריסה:
--   supabase functions deploy notify-client-question --project-ref knbbbrnwzbkywkrcponi
--   supabase functions deploy notify-new-client --project-ref knbbbrnwzbkywkrcponi
--
-- notify-client-question — אימייל ל-atlassahar14@gmail.com כשלקוח שולח שאלה
-- notify-new-client — אימייל ל-atlassahar14@gmail.com כשנוצר לקוח חדש
