-- =============================================================================
-- PDF להצעות מחיר — offer_pdf_url + bucket "price-offers" (PRIVATE)
-- פרויקט Supabase: knbbbrnwzbkywkrcponi
-- =============================================================================

alter table public.price_offers add column if not exists offer_pdf_url text;

-- ----- Bucket (private) -----
insert into storage.buckets (id, name, public, file_size_limit)
values ('price-offers', 'price-offers', false, 20971520)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit;

-- ----- Helper: גישה לפי project_id בנתיב -----
create or replace function public.can_access_price_offer_pdf(object_name text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    public.is_admin()
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.project_id is not null
        and p.project_id = split_part(object_name, '/', 1)
    );
$$;

grant execute on function public.can_access_price_offer_pdf(text) to authenticated;

-- ----- RLS policies on storage.objects -----
drop policy if exists "price_offers_pdf_insert" on storage.objects;
drop policy if exists "price_offers_pdf_select" on storage.objects;
drop policy if exists "price_offers_pdf_update" on storage.objects;
drop policy if exists "price_offers_pdf_delete" on storage.objects;

create policy "price_offers_pdf_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'price-offers'
  and public.can_access_price_offer_pdf(name)
);

create policy "price_offers_pdf_select"
on storage.objects for select to authenticated
using (
  bucket_id = 'price-offers'
  and public.can_access_price_offer_pdf(name)
);

create policy "price_offers_pdf_update"
on storage.objects for update to authenticated
using (bucket_id = 'price-offers' and public.is_admin())
with check (bucket_id = 'price-offers' and public.is_admin());

create policy "price_offers_pdf_delete"
on storage.objects for delete to authenticated
using (bucket_id = 'price-offers' and public.is_admin());
