-- =============================================================================
-- Budget Builder — standalone (ללא פרויקט)
-- הרץ ב-Supabase SQL Editor אחרי supabase-budgets-migration.sql
-- =============================================================================

alter table public.budgets alter column project_id drop not null;

alter table public.budgets add column if not exists client_name text;
alter table public.budgets add column if not exists project_address text;

create index if not exists budgets_standalone_idx
  on public.budgets (created_at desc)
  where project_id is null;

-- עדכון מדיניות קריאה: מנהל רואה הכל, לקוח רק תקציבים משויכים לפרויקט
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

select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'budgets'
order by ordinal_position;
