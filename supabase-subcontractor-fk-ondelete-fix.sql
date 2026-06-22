-- Fix: deleting a subcontractor fails with 409 (foreign key violation).
-- The subcontractor_id FK on budget_items / punch_items was created WITHOUT
-- "on delete set null", so existing references block the delete.
-- This drops any existing FK on those subcontractor_id columns and recreates
-- it with ON DELETE SET NULL. Run once in Supabase SQL Editor.

-- budget_items
do $$
declare cname text;
begin
  for cname in
    select con.conname
    from pg_constraint con
    join pg_attribute att on att.attrelid = con.conrelid and att.attnum = any(con.conkey)
    where con.conrelid = 'public.budget_items'::regclass
      and con.contype = 'f'
      and att.attname = 'subcontractor_id'
  loop
    execute format('alter table public.budget_items drop constraint %I', cname);
  end loop;
end $$;

alter table public.budget_items
  add constraint budget_items_subcontractor_id_fkey
  foreign key (subcontractor_id) references public.subcontractors(id) on delete set null;

-- punch_items
do $$
declare cname text;
begin
  for cname in
    select con.conname
    from pg_constraint con
    join pg_attribute att on att.attrelid = con.conrelid and att.attnum = any(con.conkey)
    where con.conrelid = 'public.punch_items'::regclass
      and con.contype = 'f'
      and att.attname = 'subcontractor_id'
  loop
    execute format('alter table public.punch_items drop constraint %I', cname);
  end loop;
end $$;

alter table public.punch_items
  add constraint punch_items_subcontractor_id_fkey
  foreign key (subcontractor_id) references public.subcontractors(id) on delete set null;
