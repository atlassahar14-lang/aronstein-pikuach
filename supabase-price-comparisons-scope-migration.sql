-- =============================================================================
-- השוואת מחירים: כל לקוח רואה ועורך רק את הפרויקט שלו
-- פרויקט Supabase: knbbbrnwzbkywkrcponi
-- =============================================================================
-- לפני: כל משתמש מחובר יכול היה לקרוא ולעדכן הצעות מחיר של כל הפרויקטים
-- (האתר סינן, אבל המסד לא נעל).
-- אחרי: מנהל רואה הכול; לקוח רואה, מוסיף ועורך רק הצעות של הפרויקט שלו
-- (profiles.project_id). מחיקה נשארת למנהל בלבד, כמו קודם.
--
-- ► איך להריץ: Supabase Dashboard → SQL Editor → להדביק את כל הקובץ → Run
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

-- ----- price_comparisons (הקטגוריות) -----
drop policy if exists "price_comparisons_select_auth" on public.price_comparisons;
drop policy if exists "price_comparisons_insert_auth" on public.price_comparisons;
drop policy if exists "price_comparisons_update_auth" on public.price_comparisons;

create policy "price_comparisons_select_auth"
on public.price_comparisons for select to authenticated
using (public.is_admin() or project_id = public.my_project_id());

create policy "price_comparisons_insert_auth"
on public.price_comparisons for insert to authenticated
with check (public.is_admin() or project_id = public.my_project_id());

create policy "price_comparisons_update_auth"
on public.price_comparisons for update to authenticated
using (public.is_admin() or project_id = public.my_project_id())
with check (public.is_admin() or project_id = public.my_project_id());

-- ----- price_offers (ההצעות) -----
drop policy if exists "price_offers_select_auth" on public.price_offers;
drop policy if exists "price_offers_insert_auth" on public.price_offers;
drop policy if exists "price_offers_update_auth" on public.price_offers;

create policy "price_offers_select_auth"
on public.price_offers for select to authenticated
using (
  public.is_admin()
  or project_id = public.my_project_id()
  or exists (select 1 from public.price_comparisons c
             where c.id = price_offers.comparison_id and c.project_id = public.my_project_id())
);

create policy "price_offers_insert_auth"
on public.price_offers for insert to authenticated
with check (public.is_admin() or project_id = public.my_project_id());

create policy "price_offers_update_auth"
on public.price_offers for update to authenticated
using (
  public.is_admin()
  or project_id = public.my_project_id()
  or exists (select 1 from public.price_comparisons c
             where c.id = price_offers.comparison_id and c.project_id = public.my_project_id())
)
with check (public.is_admin() or project_id = public.my_project_id());

select 'price comparisons are now scoped per project' as result;
