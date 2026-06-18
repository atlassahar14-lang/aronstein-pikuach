-- =============================================================================
-- בחירות גמרים — finish_selections
-- פרויקט Supabase: knbbbrnwzbkywkrcponi
-- =============================================================================
--
-- ► איך להריץ:
--   1. היכנס ל-Supabase Dashboard → SQL Editor
--   2. העתק והדבק את כל הקובץ הזה
--   3. לחץ Run
--
-- project_id = text (כמו app_data.projects[].id, למשל 'proj1730000000')
-- =============================================================================

create table if not exists public.finish_selections (
  id uuid primary key default gen_random_uuid(),
  project_id text not null,
  title text not null,
  description text not null default '',
  category text not null default 'אחר'
    check (category in ('ריצוף', 'סניטריה', 'תאורה', 'אלומיניום', 'מטבח', 'צבע', 'אחר')),
  due_date date not null,
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'done')),
  notes text not null default '',
  selected_by text,
  selected_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists finish_selections_project_id_idx on public.finish_selections (project_id);
create index if not exists finish_selections_project_due_idx on public.finish_selections (project_id, due_date);
create index if not exists finish_selections_project_status_idx on public.finish_selections (project_id, status);
create index if not exists finish_selections_project_category_idx on public.finish_selections (project_id, category);

alter table public.finish_selections enable row level security;

grant select, insert, update, delete on public.finish_selections to authenticated;

drop policy if exists "finish_selections_select_auth" on public.finish_selections;
drop policy if exists "finish_selections_insert_auth" on public.finish_selections;
drop policy if exists "finish_selections_update_auth" on public.finish_selections;
drop policy if exists "finish_selections_delete_admin" on public.finish_selections;

create policy "finish_selections_select_auth"
on public.finish_selections for select to authenticated using (true);

create policy "finish_selections_insert_auth"
on public.finish_selections for insert to authenticated with check (true);

create policy "finish_selections_update_auth"
on public.finish_selections for update to authenticated using (true) with check (true);

create policy "finish_selections_delete_admin"
on public.finish_selections for delete to authenticated using (public.is_admin());
