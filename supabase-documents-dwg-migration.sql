-- =============================================================================
-- תמיכה ב-DWG במסמכים — אין שינוי סכמה (מסמכים ב-app_data.projects[].documents JSONB)
-- פרויקט Supabase: knbbbrnwzbkywkrcponi
-- =============================================================================

-- אימות: bucket media קיים וציבורי להעלאת DWG/PDF
select id, public, file_size_limit
from storage.buckets
where id = 'media';
