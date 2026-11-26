-- =============================================================================
-- נעילת טבלאות: תקציבים ונתוני פרויקט לפי מנהל / הפרויקט של הלקוח
-- פרויקט Supabase: knbbbrnwzbkywkrcponi
-- =============================================================================
-- מה נמצא (26.11.26):
--   * budgets, budget_items: חוק "admin full access" פתוח לכולם (גם בלי התחברות!).
--     כל מי שמחזיק את המפתח הציבורי של האתר יכול היה לקרוא, לשנות ולמחוק כל תקציב.
--   * daily_logs, finish_selections, milestones, punch_items: כל משתמש מחובר
--     קורא ומעדכן נתונים של כל הפרויקטים.
--   * budget_changes, gantt_tasks: פתוחות לכל משתמש מחובר (לא בשימוש באתר).
--   * landing_projects: כל משתמש מחובר יכול לערוך את הפרויקטים בדף הנחיתה.
-- אחרי:
--   * תקציבים: רק מנהל יוצר, משנה ומוחק. לקוח רק קורא, ורק את התקציב שאושר
--     לפרויקט שלו (approvedBudgetId בפרויקט).
--   * יומני עבודה: לקוח קורא את של הפרויקט שלו, רק מנהל כותב.
--   * בחירת גמרים, אבני דרך, ליקויים: לקוח קורא ומעדכן רק בפרויקט שלו (כמו היום
--     באתר: סימון "בוצע", הערות). מחיקה: מנהל בלבד, כמו קודם.
--   * budget_changes, gantt_tasks: מנהל בלבד.
--   * landing_projects: כולם רואים (דף הנחיתה), רק מנהל עורך.
--
-- ► איך להריץ: Supabase Dashboard → SQL Editor → להדביק את כל הקובץ → Run (בטוח להריץ שוב)
-- =============================================================================

create or replace function public.my_project_id()
returns text language sql security definer stable set search_path = public
as $$ select project_id from public.profiles where id = auth.uid() $$;
grant execute on function public.my_project_id() to authenticated;

-- The budget approved into the client's project (stored on the project in app_data).
create or replace function public.my_approved_budget_id()
returns text language sql security definer stable set search_path = public
as $$
  select e->>'approvedBudgetId'
  from public.app_data a, jsonb_array_elements(coalesce(a.projects, '[]'::jsonb)) e
  where a.id = 'main' and e->>'id' = public.my_project_id()
  limit 1
$$;
grant execute on function public.my_approved_budget_id() to authenticated;

-- ---------- budgets ----------
drop policy if exists "admin full access budgets" on public.budgets;
drop policy if exists "budgets_select_auth" on public.budgets;
drop policy if exists "budgets_insert_admin" on public.budgets;
drop policy if exists "budgets_update_admin" on public.budgets;
drop policy if exists "budgets_delete_admin" on public.budgets;
create policy "budgets_select_auth" on public.budgets for select to authenticated
  using (public.is_admin()
         or (project_id is not null and project_id = public.my_project_id())
         or id::text = public.my_approved_budget_id());
create policy "budgets_insert_admin" on public.budgets for insert to authenticated with check (public.is_admin());
create policy "budgets_update_admin" on public.budgets for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "budgets_delete_admin" on public.budgets for delete to authenticated using (public.is_admin());

-- ---------- budget_items ----------
drop policy if exists "admin full access budget_items" on public.budget_items;
drop policy if exists "budget_items_select_auth" on public.budget_items;
drop policy if exists "budget_items_insert_admin" on public.budget_items;
drop policy if exists "budget_items_update_admin" on public.budget_items;
drop policy if exists "budget_items_delete_admin" on public.budget_items;
create policy "budget_items_select_auth" on public.budget_items for select to authenticated
  using (public.is_admin()
         or budget_id::text = public.my_approved_budget_id()
         or exists (select 1 from public.budgets b where b.id = budget_id
                    and b.project_id is not null and b.project_id = public.my_project_id()));
create policy "budget_items_insert_admin" on public.budget_items for insert to authenticated with check (public.is_admin());
create policy "budget_items_update_admin" on public.budget_items for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "budget_items_delete_admin" on public.budget_items for delete to authenticated using (public.is_admin());

-- ---------- daily_logs: client reads own project, admin writes ----------
drop policy if exists "daily_logs_select_auth" on public.daily_logs;
drop policy if exists "daily_logs_insert_auth" on public.daily_logs;
drop policy if exists "daily_logs_update_auth" on public.daily_logs;
create policy "daily_logs_select_auth" on public.daily_logs for select to authenticated
  using (public.is_admin() or project_id = public.my_project_id());
create policy "daily_logs_insert_auth" on public.daily_logs for insert to authenticated with check (public.is_admin());
create policy "daily_logs_update_auth" on public.daily_logs for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- finish_selections, milestones, punch_items: own project only ----------
drop policy if exists "finish_selections_select_auth" on public.finish_selections;
drop policy if exists "finish_selections_insert_auth" on public.finish_selections;
drop policy if exists "finish_selections_update_auth" on public.finish_selections;
create policy "finish_selections_select_auth" on public.finish_selections for select to authenticated
  using (public.is_admin() or project_id = public.my_project_id());
create policy "finish_selections_insert_auth" on public.finish_selections for insert to authenticated
  with check (public.is_admin() or project_id = public.my_project_id());
create policy "finish_selections_update_auth" on public.finish_selections for update to authenticated
  using (public.is_admin() or project_id = public.my_project_id())
  with check (public.is_admin() or project_id = public.my_project_id());

drop policy if exists "milestones_select_auth" on public.milestones;
drop policy if exists "milestones_insert_auth" on public.milestones;
drop policy if exists "milestones_update_auth" on public.milestones;
create policy "milestones_select_auth" on public.milestones for select to authenticated
  using (public.is_admin() or project_id = public.my_project_id());
create policy "milestones_insert_auth" on public.milestones for insert to authenticated
  with check (public.is_admin() or project_id = public.my_project_id());
create policy "milestones_update_auth" on public.milestones for update to authenticated
  using (public.is_admin() or project_id = public.my_project_id())
  with check (public.is_admin() or project_id = public.my_project_id());

drop policy if exists "punch_items_select_auth" on public.punch_items;
drop policy if exists "punch_items_insert_auth" on public.punch_items;
drop policy if exists "punch_items_update_auth" on public.punch_items;
create policy "punch_items_select_auth" on public.punch_items for select to authenticated
  using (public.is_admin() or project_id = public.my_project_id());
create policy "punch_items_insert_auth" on public.punch_items for insert to authenticated
  with check (public.is_admin() or project_id = public.my_project_id());
create policy "punch_items_update_auth" on public.punch_items for update to authenticated
  using (public.is_admin() or project_id = public.my_project_id())
  with check (public.is_admin() or project_id = public.my_project_id());

-- ---------- budget_changes, gantt_tasks: admin only (not used by the site) ----------
drop policy if exists "budget_changes_select_auth" on public.budget_changes;
drop policy if exists "budget_changes_insert_auth" on public.budget_changes;
drop policy if exists "budget_changes_update_auth" on public.budget_changes;
create policy "budget_changes_select_auth" on public.budget_changes for select to authenticated using (public.is_admin());
create policy "budget_changes_insert_auth" on public.budget_changes for insert to authenticated with check (public.is_admin());
create policy "budget_changes_update_auth" on public.budget_changes for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "gantt_tasks_select_auth" on public.gantt_tasks;
drop policy if exists "gantt_tasks_insert_auth" on public.gantt_tasks;
drop policy if exists "gantt_tasks_update_auth" on public.gantt_tasks;
create policy "gantt_tasks_select_auth" on public.gantt_tasks for select to authenticated using (public.is_admin());
create policy "gantt_tasks_insert_auth" on public.gantt_tasks for insert to authenticated with check (public.is_admin());
create policy "gantt_tasks_update_auth" on public.gantt_tasks for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- landing_projects: everyone reads, admin edits ----------
drop policy if exists "landing_projects_write" on public.landing_projects;
drop policy if exists "landing_projects_write_admin" on public.landing_projects;
create policy "landing_projects_write_admin" on public.landing_projects for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

select 'tables locked: budgets admin-only (client reads own approved budget), project data scoped per client' as result;
