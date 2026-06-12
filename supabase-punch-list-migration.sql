-- =============================================================================
-- Punch List module — punch_items + bucket "project-blueprints" (PRIVATE)
-- פרויקט: knbbbrnwzbkywkrcponi
-- הרץ ב-Supabase SQL Editor (Safe to re-run)
-- =============================================================================
--
-- project_id = text (כמו app_data.projects[].id, למשל 'proj1')
-- תוכנית פרויקט (blueprint) נשמרת ב-app_data.projects[].blueprint_path (Storage path)
-- העמודה blueprint_url ב-punch_items שמורה לשימוש עתידי (nullable)
--
-- דורש: public.is_admin(), public.subcontractors, public.profiles

-- ----- טבלת ליקויים -----
create table if not exists public.punch_items (
  id uuid primary key default gen_random_uuid(),
  project_id text not null,
  description text not null,
  subcontractor_id uuid references public.subcontractors(id) on delete set null,
  urgency text not null default 'בינונית'
    check (urgency in ('נמוכה', 'בינונית', 'קריטית')),
  deadline date,
  status text not null default 'open'
    check (status in ('open', 'fixed')),
  blueprint_url text,
  pin_x numeric,
  pin_y numeric,
  created_at timestamptz not null default now()
);

create index if not exists punch_items_project_id_idx on public.punch_items (project_id);
create index if not exists punch_items_status_idx on public.punch_items (project_id, status);

alter table public.punch_items enable row level security;

grant select, insert, update, delete on public.punch_items to authenticated;

drop policy if exists "punch_items_select_auth" on public.punch_items;
drop policy if exists "punch_items_insert_auth" on public.punch_items;
drop policy if exists "punch_items_update_auth" on public.punch_items;
drop policy if exists "punch_items_delete_admin" on public.punch_items;

create policy "punch_items_select_auth"
on public.punch_items for select to authenticated using (true);

create policy "punch_items_insert_auth"
on public.punch_items for insert to authenticated with check (true);

create policy "punch_items_update_auth"
on public.punch_items for update to authenticated using (true) with check (true);

create policy "punch_items_delete_admin"
on public.punch_items for delete to authenticated using (public.is_admin());

-- ----- Bucket project-blueprints (private) -----
insert into storage.buckets (id, name, public, file_size_limit)
values ('project-blueprints', 'project-blueprints', false, 20971520)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit;

create or replace function public.can_access_project_blueprint(object_name text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    public.is_admin()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.project_id is not null
        and p.project_id = split_part(object_name, '/', 1)
    );
$$;

grant execute on function public.can_access_project_blueprint(text) to authenticated;

drop policy if exists "project_blueprints_insert" on storage.objects;
drop policy if exists "project_blueprints_select" on storage.objects;
drop policy if exists "project_blueprints_update" on storage.objects;
drop policy if exists "project_blueprints_delete" on storage.objects;

create policy "project_blueprints_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'project-blueprints'
  and public.can_access_project_blueprint(name)
);

create policy "project_blueprints_select"
on storage.objects for select to authenticated
using (
  bucket_id = 'project-blueprints'
  and public.can_access_project_blueprint(name)
);

create policy "project_blueprints_update"
on storage.objects for update to authenticated
using (bucket_id = 'project-blueprints' and public.is_admin())
with check (bucket_id = 'project-blueprints' and public.is_admin());

create policy "project_blueprints_delete"
on storage.objects for delete to authenticated
using (bucket_id = 'project-blueprints' and public.is_admin());

-- ----- אימות -----
select column_name, data_type from information_schema.columns
where table_schema = 'public' and table_name = 'punch_items' order by ordinal_position;

select id, public from storage.buckets where id = 'project-blueprints';
