-- =============================================================================
-- PDF אישור קבלן משנה — approval_pdf_url + bucket "subcontractor-docs" (PRIVATE)
-- פרויקט Supabase: knbbbrnwzbkywkrcponi
-- Run once in Supabase SQL Editor.
-- =============================================================================

alter table public.subcontractors add column if not exists approval_pdf_url text;

-- ----- Bucket (private, 20MB limit) -----
insert into storage.buckets (id, name, public, file_size_limit)
values ('subcontractor-docs', 'subcontractor-docs', false, 20971520)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit;

-- ----- RLS policies on storage.objects (admin only — subcontractors are admin data) -----
drop policy if exists "subcontractor_docs_insert" on storage.objects;
drop policy if exists "subcontractor_docs_select" on storage.objects;
drop policy if exists "subcontractor_docs_update" on storage.objects;
drop policy if exists "subcontractor_docs_delete" on storage.objects;

create policy "subcontractor_docs_insert"
on storage.objects for insert to authenticated
with check (bucket_id = 'subcontractor-docs' and public.is_admin());

create policy "subcontractor_docs_select"
on storage.objects for select to authenticated
using (bucket_id = 'subcontractor-docs' and public.is_admin());

create policy "subcontractor_docs_update"
on storage.objects for update to authenticated
using (bucket_id = 'subcontractor-docs' and public.is_admin())
with check (bucket_id = 'subcontractor-docs' and public.is_admin());

create policy "subcontractor_docs_delete"
on storage.objects for delete to authenticated
using (bucket_id = 'subcontractor-docs' and public.is_admin());
