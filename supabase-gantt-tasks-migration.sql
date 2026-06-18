-- =============================================================================
-- Gantt tasks — gantt_tasks (per project timeline)
-- פרויקט: knbbbrnwzbkywkrcponi
-- הרץ ב-Supabase SQL Editor (Safe to re-run)
-- =============================================================================
--
-- project_id = text (כמו app_data.projects[].id)

create table if not exists public.gantt_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id text not null,
  task_name text not null,
  start_date date not null,
  end_date date not null,
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  status text not null default 'planned'
    check (status in ('planned', 'in_progress', 'delayed', 'done')),
  color text,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists gantt_tasks_project_id_idx on public.gantt_tasks (project_id);
create index if not exists gantt_tasks_project_order_idx on public.gantt_tasks (project_id, order_index);

alter table public.gantt_tasks enable row level security;

grant select, insert, update, delete on public.gantt_tasks to authenticated;

drop policy if exists "gantt_tasks_select_auth" on public.gantt_tasks;
drop policy if exists "gantt_tasks_insert_auth" on public.gantt_tasks;
drop policy if exists "gantt_tasks_update_auth" on public.gantt_tasks;
drop policy if exists "gantt_tasks_delete_admin" on public.gantt_tasks;

create policy "gantt_tasks_select_auth"
on public.gantt_tasks for select to authenticated using (true);

create policy "gantt_tasks_insert_auth"
on public.gantt_tasks for insert to authenticated with check (true);

create policy "gantt_tasks_update_auth"
on public.gantt_tasks for update to authenticated using (true) with check (true);

create policy "gantt_tasks_delete_admin"
on public.gantt_tasks for delete to authenticated using (public.is_admin());
