-- =============================================================================
-- Daily Work Log module — טבלת public.daily_logs
-- פרויקט: knbbbrnwzbkywkrcponi
-- הרץ ב-Supabase SQL Editor (Safe to re-run)
-- =============================================================================
--
-- project_id = text (כמו app_data.projects[].id, למשל 'proj1')
-- workers = jsonb מערך: [{"subcontractor_id":"uuid","count":5}, ...]
--
-- דורש: public.is_admin(), public.subcontractors

-- ----- טבלת יומן עבודה -----
create table if not exists public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  project_id text not null,
  log_date date not null default current_date,
  weather text not null default 'בהיר'
    check (weather in ('בהיר', 'גשום', 'מעונן', 'רוח חזקה')),
  workers jsonb not null default '[]'::jsonb,
  issues text,
  created_at timestamptz not null default now()
);

create index if not exists daily_logs_project_id_idx on public.daily_logs (project_id);
create index if not exists daily_logs_log_date_idx on public.daily_logs (project_id, log_date desc);

alter table public.daily_logs enable row level security;

grant select, insert, update, delete on public.daily_logs to authenticated;

drop policy if exists "daily_logs_select_auth" on public.daily_logs;
drop policy if exists "daily_logs_insert_auth" on public.daily_logs;
drop policy if exists "daily_logs_update_auth" on public.daily_logs;
drop policy if exists "daily_logs_delete_admin" on public.daily_logs;

create policy "daily_logs_select_auth"
on public.daily_logs for select to authenticated using (true);

create policy "daily_logs_insert_auth"
on public.daily_logs for insert to authenticated with check (true);

create policy "daily_logs_update_auth"
on public.daily_logs for update to authenticated using (true) with check (true);

create policy "daily_logs_delete_admin"
on public.daily_logs for delete to authenticated using (public.is_admin());

-- ----- אימות -----
select column_name, data_type from information_schema.columns
where table_schema = 'public' and table_name = 'daily_logs' order by ordinal_position;
