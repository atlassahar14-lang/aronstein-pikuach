-- =============================================================================
-- נתוני הפרויקטים (app_data): כל לקוח רואה ושומר רק את הפרויקט שלו
-- פרויקט Supabase: knbbbrnwzbkywkrcponi
-- =============================================================================
-- לפני: כל הפרויקטים של כל הלקוחות יושבים בשורה אחת (app_data id='main'),
-- וכל משתמש מחובר יכול היה לקרוא את כולה ולשמור מעליה. כלומר לקוח יכול היה
-- לראות פרויקטים של לקוחות אחרים, ושמירה של לקוח יכלה לדרוס שינוי שלך.
-- אחרי:
--   * מנהל: רואה ושומר הכול, כמו קודם.
--   * לקוח: מקבל רק את הפרויקט שלו (get_my_app_data), ושומר רק אותו
--     (save_my_project). השרת מחליף רק את הפרויקט הזה בתוך המערך, כך שכל
--     השאר לא נוגע. הגדרות הנראות (client_visibility) נשארות כפי שהמנהל קבע.
--   * קריאה/כתיבה ישירה לשורה ו-save_app_data: מנהל בלבד.
--
-- דורש: public.is_admin() ו-public.my_project_id() (מקובץ
-- supabase-price-comparisons-scope-migration.sql, הוגדרה שוב כאן ליתר ביטחון).
--
-- ► איך להריץ: Supabase Dashboard → SQL Editor → להדביק את כל הקובץ → Run
--   (בטוח להריץ שוב)
-- =============================================================================

create or replace function public.my_project_id()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select project_id from public.profiles where id = auth.uid()
$$;
grant execute on function public.my_project_id() to authenticated;

-- ----- קריאה: מה שהמשתמש רשאי לראות -----
create or replace function public.get_my_app_data()
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_row public.app_data%rowtype;
  v_pid text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  select * into v_row from public.app_data where id = 'main';
  if not found then
    return null;
  end if;
  if public.is_admin() then
    return jsonb_build_object(
      'projects', coalesce(v_row.projects, '[]'::jsonb),
      'activity_log', coalesce(v_row.activity_log, '[]'::jsonb),
      'specialties', coalesce(v_row.specialties, '[]'::jsonb)
    );
  end if;
  v_pid := public.my_project_id();
  return jsonb_build_object(
    'projects', coalesce((
      select jsonb_agg(e)
      from jsonb_array_elements(coalesce(v_row.projects, '[]'::jsonb)) e
      where v_pid is not null and e->>'id' = v_pid
    ), '[]'::jsonb),
    'activity_log', '[]'::jsonb,
    'specialties', coalesce(v_row.specialties, '[]'::jsonb)
  );
end;
$$;
grant execute on function public.get_my_app_data() to authenticated;

-- ----- שמירה של לקוח: רק הפרויקט שלו -----
create or replace function public.save_my_project(p_project jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pid text;
  v_projects jsonb;
  v_old jsonb;
  v_new jsonb;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_project is null or jsonb_typeof(p_project) <> 'object' then
    raise exception 'invalid project' using errcode = '22023';
  end if;
  if public.is_admin() then
    v_pid := p_project->>'id';
  else
    v_pid := public.my_project_id();
    if v_pid is null or p_project->>'id' is distinct from v_pid then
      raise exception 'not your project' using errcode = '42501';
    end if;
  end if;

  -- נעילת השורה כדי ששתי שמירות במקביל לא ידרסו זו את זו
  select projects into v_projects from public.app_data where id = 'main' for update;
  if not found then
    raise exception 'no data row' using errcode = 'P0002';
  end if;

  select e into v_old
  from jsonb_array_elements(coalesce(v_projects, '[]'::jsonb)) e
  where e->>'id' = v_pid
  limit 1;
  if v_old is null then
    raise exception 'project not found' using errcode = 'P0002';
  end if;

  v_new := p_project;
  if not public.is_admin() then
    -- לקוח לא יכול לשנות מה מוסתר ממנו
    if v_old ? 'client_visibility' then
      v_new := jsonb_set(v_new, '{client_visibility}', v_old->'client_visibility');
    else
      v_new := v_new - 'client_visibility';
    end if;
  end if;

  update public.app_data
  set projects = (
        select jsonb_agg(case when e->>'id' = v_pid then v_new else e end order by ord)
        from jsonb_array_elements(v_projects) with ordinality as t(e, ord)
      ),
      updated_at = now()
  where id = 'main';
end;
$$;
grant execute on function public.save_my_project(jsonb) to authenticated;

-- ----- שמירה של כל השורה: מנהל בלבד -----
create or replace function public.save_app_data(p_projects jsonb, p_activity_log jsonb default '[]'::jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_activity jsonb;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;

  v_activity := coalesce(p_activity_log, '[]'::jsonb);
  if jsonb_typeof(v_activity) <> 'array' then
    v_activity := '[]'::jsonb;
  end if;

  insert into public.app_data (id, projects, activity_log, updated_at)
  values ('main', coalesce(p_projects, '[]'::jsonb), v_activity, now())
  on conflict (id) do update set
    projects = excluded.projects,
    activity_log = excluded.activity_log,
    updated_at = now();
end;
$$;
grant execute on function public.save_app_data(jsonb, jsonb) to authenticated;

-- ----- גישה ישירה לשורה: מנהל בלבד -----
drop policy if exists "app_data_select_auth" on public.app_data;
create policy "app_data_select_auth" on public.app_data
  for select to authenticated using (public.is_admin());

drop policy if exists "app_data_insert_auth" on public.app_data;
create policy "app_data_insert_auth" on public.app_data
  for insert to authenticated with check (public.is_admin());

drop policy if exists "app_data_update_auth" on public.app_data;
create policy "app_data_update_auth" on public.app_data
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

select 'app_data is now scoped: clients see and save only their own project' as result;
