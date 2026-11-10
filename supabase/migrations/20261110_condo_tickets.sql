-- Ticket della "Bacheca urgente" dell'area condominio. Privati: li vedono
-- e li gestiscono solo i membri verificati di quel condominio
-- (public.condo_members). Separati da public.building_reports, che e'
-- pubblica e alimenta le statistiche "Segnalazioni" della pagina edificio.

create table if not exists public.condo_tickets (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings (id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 140),
  category text not null check (category in (
    'noise', 'maintenance', 'security', 'infiltration', 'elevator',
    'cleaning', 'heating', 'common_areas', 'pests', 'waste', 'admin', 'other'
  )),
  description text,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  closed_by uuid references auth.users (id) on delete set null
);

create index if not exists condo_tickets_building_created_idx
  on public.condo_tickets (building_id, created_at desc);

alter table public.condo_tickets enable row level security;

-- Lettura: solo membri del condominio (niente anon, niente non membri).
create policy "condo_tickets: members read"
  on public.condo_tickets
  for select
  to authenticated
  using (exists (
    select 1 from public.condo_members m
    where m.building_id = condo_tickets.building_id and m.user_id = auth.uid()
  ));

-- Apertura: solo membri, solo a proprio nome, sempre in stato aperto.
create policy "condo_tickets: members insert own"
  on public.condo_tickets
  for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and status = 'open'
    and exists (
      select 1 from public.condo_members m
      where m.building_id = condo_tickets.building_id and m.user_id = auth.uid()
    )
  );

-- Chiudi / riapri / modifica: chi ha aperto il ticket o l'admin del
-- condominio, e comunque solo se ancora membro.
create policy "condo_tickets: author or admin update"
  on public.condo_tickets
  for update
  to authenticated
  using (exists (
    select 1 from public.condo_members m
    where m.building_id = condo_tickets.building_id and m.user_id = auth.uid()
      and (m.role = 'admin' or condo_tickets.created_by = auth.uid())
  ))
  with check (exists (
    select 1 from public.condo_members m
    where m.building_id = condo_tickets.building_id and m.user_id = auth.uid()
      and (m.role = 'admin' or condo_tickets.created_by = auth.uid())
  ));

-- Eliminazione: stesse regole dell'update.
create policy "condo_tickets: author or admin delete"
  on public.condo_tickets
  for delete
  to authenticated
  using (exists (
    select 1 from public.condo_members m
    where m.building_id = condo_tickets.building_id and m.user_id = auth.uid()
      and (m.role = 'admin' or condo_tickets.created_by = auth.uid())
  ));

-- building_id e created_by non sono modificabili dopo la creazione.
revoke all on public.condo_tickets from anon;
grant select, insert, delete on public.condo_tickets to authenticated;
grant update (title, category, description, status, closed_at, closed_by) on public.condo_tickets to authenticated;
