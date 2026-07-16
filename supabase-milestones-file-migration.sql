-- =============================================================================
-- קובץ מצורף לאבן דרך (תזכורת) — milestones file columns
-- =============================================================================
--
-- ► איך להריץ (חובה כדי לצרף קבצים לתזכורות):
--   1. היכנס ל-Supabase Dashboard → SQL Editor
--   2. העתק והדבק את כל הקובץ הזה
--   3. לחץ Run
--   4. בטוח להרצה חוזרת (IF NOT EXISTS)
--
-- דורש: טבלת public.milestones (supabase-milestones-migration.sql)
-- =============================================================================

alter table public.milestones
  add column if not exists file_url text,
  add column if not exists file_name text,
  add column if not exists file_path text;
