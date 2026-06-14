-- =============================================================================
-- Gallery posts — stage column
-- פרויקט: knbbbrnwzbkywkrcponi
-- הרץ ב-Supabase SQL Editor (Safe to re-run)
--
-- הערה: האפליקציה הנוכחית שומרת גלריה ב-JSON בתוך app_data.projects
-- (שדה galleryPosts[].stage). הרץ את הסקרipt הזה רק אם קיימת אצלך טבלת gallery
-- נפרדת (למשל gallery_posts).
-- =============================================================================

alter table public.gallery_posts add column if not exists stage text not null default 'כללי';

select column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'gallery_posts'
  and column_name = 'stage';
