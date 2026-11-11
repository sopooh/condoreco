-- Fornitori salvati (segnalibro nella lista Fornitori)
create table if not exists public.saved_suppliers (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, supplier_id)
);
alter table public.saved_suppliers enable row level security;
create policy "saved_suppliers: own read" on public.saved_suppliers for select to authenticated using (user_id = auth.uid());
create policy "saved_suppliers: own insert" on public.saved_suppliers for insert to authenticated with check (user_id = auth.uid());
create policy "saved_suppliers: own delete" on public.saved_suppliers for delete to authenticated using (user_id = auth.uid());
revoke all on public.saved_suppliers from anon;
grant select, insert, delete on public.saved_suppliers to authenticated;
