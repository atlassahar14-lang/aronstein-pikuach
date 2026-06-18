-- =============================================================================
-- אבני דרך קריטיות — milestones
-- פרויקט Supabase: knbbbrnwzbkywkrcponi
-- =============================================================================
--
-- ► איך להריץ (חובה לפני שימוש במסך "אבני דרך" באתר):
--   1. היכנס ל-Supabase Dashboard → SQL Editor
--   2. העתק והדבק את כל הקובץ הזה
--   3. לחץ Run
--   4. ודא שאין שגיאות — הקובץ בטוח להרצה חוזרת (IF NOT EXISTS)
--
-- project_id = text (כמו app_data.projects[].id, למשל 'proj1730000000')
-- דורש: public.is_admin()
-- =============================================================================

create table if not exists public.milestones (
  id uuid primary key default gen_random_uuid(),
  project_id text not null,
  title text not null,
  description text not null default '',
  due_date date not null,
  status text not null default 'pending'
    check (status in ('pending', 'done')),
  priority text not null default 'medium'
    check (priority in ('high', 'medium')),
  alert_days_before integer not null default 14 check (alert_days_before >= 0),
  created_at timestamptz not null default now()
);

create index if not exists milestones_project_id_idx on public.milestones (project_id);
create index if not exists milestones_project_due_idx on public.milestones (project_id, due_date);
create index if not exists milestones_project_status_idx on public.milestones (project_id, status);

alter table public.milestones enable row level security;

grant select, insert, update, delete on public.milestones to authenticated;

drop policy if exists "milestones_select_auth" on public.milestones;
drop policy if exists "milestones_insert_auth" on public.milestones;
drop policy if exists "milestones_update_auth" on public.milestones;
drop policy if exists "milestones_delete_admin" on public.milestones;

create policy "milestones_select_auth"
on public.milestones for select to authenticated using (true);

create policy "milestones_insert_auth"
on public.milestones for insert to authenticated with check (true);

create policy "milestones_update_auth"
on public.milestones for update to authenticated using (true) with check (true);

create policy "milestones_delete_admin"
on public.milestones for delete to authenticated using (public.is_admin());
