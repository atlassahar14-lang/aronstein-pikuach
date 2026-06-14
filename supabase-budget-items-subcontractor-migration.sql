-- Budget Builder — per-item subcontractor (contact)
-- Run in Supabase SQL Editor after prior budget migrations.

alter table public.budget_items
  add column if not exists subcontractor_id uuid references public.subcontractors(id) on delete set null;

create index if not exists budget_items_subcontractor_id_idx
  on public.budget_items (subcontractor_id);

-- verify
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'budget_items'
  and column_name = 'subcontractor_id';
