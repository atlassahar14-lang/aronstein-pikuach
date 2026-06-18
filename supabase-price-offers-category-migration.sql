-- =============================================================================
-- השוואת מחירים לפי קטגוריה — project_id + category על price_offers
-- פרויקט Supabase: knbbbrnwzbkywkrcponi
-- =============================================================================

alter table public.price_offers add column if not exists project_id text;
alter table public.price_offers add column if not exists category text not null default 'אחר';

update public.price_offers o
set
  project_id = c.project_id,
  category = coalesce(nullif(trim(c.category), ''), 'אחר')
from public.price_comparisons c
where o.comparison_id = c.id
  and (o.project_id is null or o.project_id = '');

alter table public.price_offers alter column comparison_id drop not null;

create index if not exists price_offers_project_id_idx on public.price_offers (project_id);
create index if not exists price_offers_project_category_idx on public.price_offers (project_id, category);

alter table public.app_data add column if not exists price_categories jsonb not null default '[]'::jsonb;

update public.app_data
set price_categories = '["ריצוף","אלומיניום","חשמל","אינסטלציה","גמרים","אחר"]'::jsonb
where id = 'main'
  and (
    price_categories is null
    or jsonb_typeof(price_categories) <> 'array'
    or price_categories = '[]'::jsonb
  );
