-- =============================================================================
-- Payment receipts Storage — bucket "payment-receipts" (PRIVATE)
-- פרויקט: knbbbrnwzbkywkrcponi
-- הרץ ב-Supabase SQL Editor (Safe to re-run)
-- =============================================================================
--
-- הערת סכמה: אין טבלת payments נפרדת.
-- תשלומים נשמרים ב-app_data.projects (JSONB) → projects[].payments[].
-- השדה receipt_url (text) נשמר באובייקט התשלום ב-JSON, לא בעמודת SQL.
-- נתיב הקובץ ב-Storage: {project_id}/{payment_id}-{timestamp}.{ext}
--
-- דורש: public.is_admin() (מתוך supabase-setup.sql)

-- ----- Bucket (private) -----
insert into storage.buckets (id, name, public, file_size_limit)
values ('payment-receipts', 'payment-receipts', false, 20971520)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit;

-- ----- Helper: האם המשתמש המחובר רשאי לגשת לנתיב ב-bucket -----
create or replace function public.can_access_payment_receipt(object_name text)
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

grant execute on function public.can_access_payment_receipt(text) to authenticated;

-- ----- RLS policies on storage.objects -----
drop policy if exists "payment_receipts_insert" on storage.objects;
drop policy if exists "payment_receipts_select" on storage.objects;
drop policy if exists "payment_receipts_update" on storage.objects;
drop policy if exists "payment_receipts_delete" on storage.objects;

-- העלאה: מנהל או לקוח משויך לפרויקט (לפי תיקיית project_id בנתיב)
create policy "payment_receipts_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'payment-receipts'
  and public.can_access_payment_receipt(name)
);

-- קריאה / signed URL: אותה בדיקת שיוך לפרויקט
create policy "payment_receipts_select"
on storage.objects for select to authenticated
using (
  bucket_id = 'payment-receipts'
  and public.can_access_payment_receipt(name)
);

-- עדכון / מחיקה: מנהל בלבד
create policy "payment_receipts_update"
on storage.objects for update to authenticated
using (bucket_id = 'payment-receipts' and public.is_admin())
with check (bucket_id = 'payment-receipts' and public.is_admin());

create policy "payment_receipts_delete"
on storage.objects for delete to authenticated
using (bucket_id = 'payment-receipts' and public.is_admin());

-- ----- אימות -----
select id, public, file_size_limit from storage.buckets where id = 'payment-receipts';

select policyname, cmd from pg_policies
where schemaname = 'storage' and tablename = 'objects'
  and policyname like 'payment_receipts_%';
