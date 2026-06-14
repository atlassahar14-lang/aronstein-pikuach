-- =============================================================================
-- Budget Builder — budgets + budget_items
-- פרויקט: knbbbrnwzbkywkrcponi
-- הרץ ב-Supabase SQL Editor (Safe to re-run)
-- =============================================================================
--
-- project_id = text (כמו app_data.projects[].id)
-- דורש: public.is_admin(), public.profiles

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  project_id text,
  client_name text,
  project_address text,
  title text not null,
  budget_date date not null default current_date,
  notes text,
  margin_percent numeric(5,2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists budgets_project_id_idx on public.budgets (project_id, created_at desc)
  where project_id is not null;

create index if not exists budgets_standalone_idx on public.budgets (created_at desc)
  where project_id is null;

create table if not exists public.budget_items (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references public.budgets(id) on delete cascade,
  category text not null,
  description text not null default '',
  quantity numeric(12,3) not null default 1,
  unit text not null default 'יח''',
  unit_price numeric(14,2) not null default 0,
  total numeric(14,2) generated always as (round(quantity * unit_price, 2)) stored,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists budget_items_budget_id_idx on public.budget_items (budget_id, sort_order);

alter table public.budgets enable row level security;
alter table public.budget_items enable row level security;

grant select, insert, update, delete on public.budgets to authenticated;
grant select, insert, update, delete on public.budget_items to authenticated;

-- ----- budgets policies -----
drop policy if exists "budgets_select_auth" on public.budgets;
drop policy if exists "budgets_insert_admin" on public.budgets;
drop policy if exists "budgets_update_admin" on public.budgets;
drop policy if exists "budgets_delete_admin" on public.budgets;

create policy "budgets_select_auth"
on public.budgets for select to authenticated
using (
  public.is_admin()
  or (
    project_id is not null
    and project_id = (select project_id from public.profiles where id = auth.uid())
  )
);

create policy "budgets_insert_admin"
on public.budgets for insert to authenticated
with check (public.is_admin());

create policy "budgets_update_admin"
on public.budgets for update to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "budgets_delete_admin"
on public.budgets for delete to authenticated
using (public.is_admin());

-- ----- budget_items policies -----
drop policy if exists "budget_items_select_auth" on public.budget_items;
drop policy if exists "budget_items_insert_admin" on public.budget_items;
drop policy if exists "budget_items_update_admin" on public.budget_items;
drop policy if exists "budget_items_delete_admin" on public.budget_items;

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

create policy "budget_items_insert_admin"
on public.budget_items for insert to authenticated
with check (
  public.is_admin()
  and exists (select 1 from public.budgets b where b.id = budget_id)
);

create policy "budget_items_update_admin"
on public.budget_items for update to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "budget_items_delete_admin"
on public.budget_items for delete to authenticated
using (public.is_admin());

select column_name, data_type from information_schema.columns
where table_schema = 'public' and table_name = 'budgets' order by ordinal_position;
