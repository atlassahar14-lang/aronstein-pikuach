-- =============================================================================
-- שחזור קטגוריות השוואת מחיר מ-price_offers → price_comparisons
-- פרויקט Supabase: knbbbrnwzbkywkrcponi
-- =============================================================================

insert into public.price_comparisons (project_id, title, category, description)
select distinct
  o.project_id,
  trim(o.category),
  trim(o.category),
  ''
from public.price_offers o
where o.project_id is not null
  and trim(coalesce(o.category, '')) <> ''
  and not exists (
    select 1
    from public.price_comparisons c
    where c.project_id = o.project_id
      and trim(c.category) = trim(o.category)
  );

update public.price_offers o
set category = coalesce(nullif(trim(c.category), ''), nullif(trim(c.title), ''), o.category)
from public.price_comparisons c
where o.comparison_id = c.id
  and (o.category is null or trim(o.category) = '' or o.category = 'אחר');

update public.price_offers o
set project_id = c.project_id
from public.price_comparisons c
where o.comparison_id = c.id
  and (o.project_id is null or o.project_id = '');
