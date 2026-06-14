-- =============================================================================
-- Budget Builder — allow standalone budgets (project_id nullable)
-- פרויקט: knbbbrnwzbkywkrcponi
-- הרץ ב-Supabase SQL Editor (Safe to re-run)
--
-- נדרש אם קיבלת: null value in column "project_id" violates not-null constraint
-- =============================================================================

alter table public.budgets alter column project_id drop not null;

alter table public.budgets add column if not exists client_name text;
alter table public.budgets add column if not exists project_address text;

drop index if exists public.budgets_standalone_idx;
create index if not exists budgets_standalone_idx
  on public.budgets (created_at desc)
  where project_id is null;

drop policy if exists "budgets_select_auth" on public.budgets;
create policy "budgets_select_auth"
on public.budgets for select to authenticated
using (
  public.is_admin()
  or (
    project_id is not null
    and project_id = (select project_id from public.profiles where id = auth.uid())
  )
);

drop policy if exists "budget_items_select_auth" on public.budget_items;
create policy "budget_items_select_auth"
on public.budget_items for select to authenticated
using (
  exists (
    select 1 from public.budgets b
    where b.id = budget_id
    and (
      public.is_admin()
      or (
        b.project_id is not null
        and b.project_id = (select project_id from public.profiles where id = auth.uid())
      )
    )
  )
);

select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'budgets' and column_name = 'project_id';
