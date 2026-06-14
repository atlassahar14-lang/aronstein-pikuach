-- =============================================================================
-- Budget Builder — איש קשר (קבלן) לכל קטגוריה
-- הרץ ב-Supabase SQL Editor (Safe to re-run)
-- =============================================================================

alter table public.budgets add column if not exists category_contacts jsonb not null default '{}'::jsonb;

select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'budgets' and column_name = 'category_contacts';
