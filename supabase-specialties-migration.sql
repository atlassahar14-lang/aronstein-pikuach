-- Run in Supabase SQL Editor (project knbbbrnwzbkywkrcponi)
-- Adds dynamic subcontractor specialties list to app_data

alter table public.app_data add column if not exists specialties jsonb not null default '[]'::jsonb;

update public.app_data
set specialties = '[
  "שלד ובטון",
  "טיח וריצוף",
  "חשמל",
  "אינסטלציה וצנרת",
  "גבס ותקרות",
  "איטום וחוץ",
  "מסגרות ואלומיניום",
  "עיצוב פנים",
  "ניהול פרויקט",
  "אחר"
]'::jsonb
where id = 'main'
  and (
    specialties is null
    or jsonb_typeof(specialties) <> 'array'
    or specialties = '[]'::jsonb
  );
