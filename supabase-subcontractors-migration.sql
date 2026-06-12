-- =============================================================================
-- Subcontractors module — טבלת public.subcontractors
-- פרויקט: knbbbrnwzbkywkrcponi
-- הרץ ב-Supabase SQL Editor (Safe to re-run)
-- =============================================================================
--
-- הערת סכמה: אין טבלת phases נפרדת.
-- שלבים נשמרים ב-app_data.projects (JSONB) → projects[].phases[].
-- השדה subcontractor_id (uuid, nullable) נשמר באובייקט השלב ב-JSON,
-- עם FK לוגי ל-subcontractors.id (לא enforced ב-PostgreSQL).
--
-- דורש: public.is_admin() (מתוך supabase-setup.sql)

-- ----- טבלה -----
create table if not exists public.subcontractors (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_name text,
  phone text,
  email text,
  specialty text,
  insurance_expiry date,
  safety_cert_expiry date,
  created_at timestamptz not null default now()
);

create index if not exists subcontractors_company_name_idx
  on public.subcontractors (company_name);

alter table public.subcontractors enable row level security;

grant select, insert, update, delete on public.subcontractors to authenticated;

-- ----- RLS -----
drop policy if exists "subcontractors_select_auth" on public.subcontractors;
drop policy if exists "subcontractors_insert_admin" on public.subcontractors;
drop policy if exists "subcontractors_update_admin" on public.subcontractors;
drop policy if exists "subcontractors_delete_admin" on public.subcontractors;

-- כל משתמש מחובר יכול לקרוא (לבחירת קבלן בטופס שלב)
create policy "subcontractors_select_auth"
on public.subcontractors for select to authenticated
using (true);

-- מנהל — CRUD מלא
create policy "subcontractors_insert_admin"
on public.subcontractors for insert to authenticated
with check (public.is_admin());

create policy "subcontractors_update_admin"
on public.subcontractors for update to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "subcontractors_delete_admin"
on public.subcontractors for delete to authenticated
using (public.is_admin());

-- ----- אימות -----
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'subcontractors'
order by ordinal_position;

select policyname, cmd from pg_policies
where schemaname = 'public' and tablename = 'subcontractors';
