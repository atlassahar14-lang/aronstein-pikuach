-- =============================================================================
-- תלויות שלבים בלוח זמנים — depends_on
-- פרויקט Supabase: knbbbrnwzbkywkrcponi
-- =============================================================================
--
-- שלבים נשמרים ב-app_data.projects (JSONB) → projects[].phases[].
-- אין טבלת phases נפרדת — השדה depends_on הוא מערך מזהי שלבים (text[] ב-JSON).
--
-- ► איך להריץ:
--   1. Supabase Dashboard → SQL Editor
--   2. העתק והדבק את כל הקובץ
--   3. לחץ Run
-- =============================================================================

-- מילוי depends_on: [] לשלבים קיימים שאין להם את השדה
update public.app_data
set projects = (
  select coalesce(jsonb_agg(
    jsonb_set(
      proj,
      '{phases}',
      coalesce((
        select jsonb_agg(
          case
            when ph ? 'depends_on' then ph
            else ph || '{"depends_on": []}'::jsonb
          end
        )
        from jsonb_array_elements(
          case when jsonb_typeof(proj->'phases') = 'array' then proj->'phases' else '[]'::jsonb end
        ) as ph
      ), '[]'::jsonb)
    )
  ), '[]'::jsonb)
  from jsonb_array_elements(projects) as proj
)
where id = 'main';
