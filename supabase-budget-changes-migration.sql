-- =============================================================================
-- חריגות תקציביות ושינויים — budget_changes
-- פרויקט Supabase: knbbbrnwzbkywkrcponi
-- =============================================================================
--
-- ► איך להריץ (חובה לפני שימוש במסך "שינויים תקציביים" באתר):
--   1. היכנס ל-Supabase Dashboard → SQL Editor
--   2. העתק והדבק את כל הקובץ הזה
--   3. לחץ Run
--   4. ודא שאין שגיאות — הקובץ בטוח להרצה חוזרת (IF NOT EXISTS)
--
-- project_id = text (כמו app_data.projects[].id)
-- requested_by / approved_by = שם המשתמש (טקסט)
-- דורש: public.is_admin()
-- =============================================================================

create table if not exists public.budget_changes (
  id uuid primary key default gen_random_uuid(),
  project_id text not null,
  title text not null,
  description text not null default '',
  amount numeric not null check (amount >= 0),
  change_type text not null default 'addition'
    check (change_type in ('addition', 'reduction')),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  requested_by text,
  approved_by text,
  created_at timestamptz not null default now()
);

create index if not exists budget_changes_project_id_idx on public.budget_changes (project_id);
create index if not exists budget_changes_project_status_idx on public.budget_changes (project_id, status);
create index if not exists budget_changes_created_idx on public.budget_changes (project_id, created_at desc);

alter table public.budget_changes enable row level security;

grant select, insert, update, delete on public.budget_changes to authenticated;

drop policy if exists "budget_changes_select_auth" on public.budget_changes;
drop policy if exists "budget_changes_insert_auth" on public.budget_changes;
drop policy if exists "budget_changes_update_auth" on public.budget_changes;
drop policy if exists "budget_changes_delete_admin" on public.budget_changes;

create policy "budget_changes_select_auth"
on public.budget_changes for select to authenticated using (true);

create policy "budget_changes_insert_auth"
on public.budget_changes for insert to authenticated with check (true);

create policy "budget_changes_update_auth"
on public.budget_changes for update to authenticated using (true) with check (true);

create policy "budget_changes_delete_admin"
on public.budget_changes for delete to authenticated using (public.is_admin());
