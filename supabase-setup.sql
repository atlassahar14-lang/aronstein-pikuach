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
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.app_data enable row level security;

create policy "profiles_select_own" on public.profiles
  for select to authenticated using (auth.uid() = id);

create policy "profiles_select_admin" on public.profiles
  for select to authenticated using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

create policy "profiles_insert_admin" on public.profiles
  for insert to authenticated with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "profiles_update_own" on public.profiles
  for update to authenticated using (auth.uid() = id);

create policy "profiles_update_admin" on public.profiles
  for update to authenticated using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "profiles_delete_admin" on public.profiles
  for delete to authenticated using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "app_data_select_auth" on public.app_data
  for select to authenticated using (true);

create policy "app_data_insert_auth" on public.app_data
  for insert to authenticated with check (true);

create policy "app_data_update_auth" on public.app_data
  for update to authenticated using (true);

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

-- עדכון מגרסה קודמת (הרץ אם כבר יצרת את הטבלאות בעבר):
-- drop policy if exists "profiles_update_admin" on public.profiles;
-- create policy "profiles_update_admin" on public.profiles
--   for update to authenticated using (
--     exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
--   );
-- ואז הרץ שוב את create or replace function public.handle_new_user() למעלה.
