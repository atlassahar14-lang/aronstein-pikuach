-- =============================================================================
-- profiles.phone — טלפון לקוח (לשימוש בטופס עריכת פרויקט)
-- פרויקט: knbbbrnwzbkywkrcponi
-- הרץ ב-Supabase SQL Editor (Safe to re-run)
-- =============================================================================
--
-- קישור לקוח↔פרויקט: profiles.project_id → app_data.projects[].id
-- (אין client_id על אובייקט הפרויקט ב-JSON)

alter table public.profiles add column if not exists phone text;

-- ----- אימות -----
select column_name, data_type from information_schema.columns
where table_schema = 'public' and table_name = 'profiles' and column_name = 'phone';
