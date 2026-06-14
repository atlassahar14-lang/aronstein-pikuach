-- =============================================================================
-- Punch items — location + photo_url
-- פרויקט: knbbbrnwzbkywkrcponi
-- הרץ ב-Supabase SQL Editor (Safe to re-run)
-- =============================================================================

alter table public.punch_items add column if not exists location text;
alter table public.punch_items add column if not exists photo_url text;

select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'punch_items'
  and column_name in ('location', 'photo_url')
order by column_name;
