-- =============================================================================
-- השוואת הצעות מחיר — price_comparisons + price_offers
-- פרויקט Supabase: knbbbrnwzbkywkrcponi
-- =============================================================================

create table if not exists public.price_comparisons (
  id uuid primary key default gen_random_uuid(),
  project_id text not null,
  title text not null,
  description text not null default '',
  category text not null default 'אחר',
  created_at timestamptz not null default now()
);

create table if not exists public.price_offers (
  id uuid primary key default gen_random_uuid(),
  comparison_id uuid not null references public.price_comparisons(id) on delete cascade,
  contractor_name text not null,
  material_type text not null default '',
  material_cost numeric(12,2) not null default 0,
  labor_cost numeric(12,2) not null default 0,
  includes_vat boolean not null default false,
  includes_waste_removal boolean not null default false,
  notes text not null default '',
  total_price numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists price_comparisons_project_id_idx on public.price_comparisons (project_id);
create index if not exists price_comparisons_project_created_idx on public.price_comparisons (project_id, created_at desc);
create index if not exists price_offers_comparison_id_idx on public.price_offers (comparison_id);
create index if not exists price_offers_comparison_total_idx on public.price_offers (comparison_id, total_price);

alter table public.price_comparisons enable row level security;
alter table public.price_offers enable row level security;

grant select, insert, update, delete on public.price_comparisons to authenticated;
grant select, insert, update, delete on public.price_offers to authenticated;

drop policy if exists "price_comparisons_select_auth" on public.price_comparisons;
drop policy if exists "price_comparisons_insert_auth" on public.price_comparisons;
drop policy if exists "price_comparisons_update_auth" on public.price_comparisons;
drop policy if exists "price_comparisons_delete_admin" on public.price_comparisons;

create policy "price_comparisons_select_auth"
on public.price_comparisons for select to authenticated using (true);

create policy "price_comparisons_insert_auth"
on public.price_comparisons for insert to authenticated with check (true);

create policy "price_comparisons_update_auth"
on public.price_comparisons for update to authenticated using (true) with check (true);

create policy "price_comparisons_delete_admin"
on public.price_comparisons for delete to authenticated using (public.is_admin());

drop policy if exists "price_offers_select_auth" on public.price_offers;
drop policy if exists "price_offers_insert_auth" on public.price_offers;
drop policy if exists "price_offers_update_auth" on public.price_offers;
drop policy if exists "price_offers_delete_admin" on public.price_offers;

create policy "price_offers_select_auth"
on public.price_offers for select to authenticated using (true);

create policy "price_offers_insert_auth"
on public.price_offers for insert to authenticated with check (true);

create policy "price_offers_update_auth"
on public.price_offers for update to authenticated using (true) with check (true);

create policy "price_offers_delete_admin"
on public.price_offers for delete to authenticated using (public.is_admin());
