-- Segnalazioni sui condomini (rumore, manutenzione, sicurezza, ecc.), separate
-- dalle recensioni: alimentano la sezione "Segnalazioni passate" sulla pagina
-- edificio (conteggio totale, aperte/risolte, per categoria, ultima segnalazione).

create table if not exists public.building_reports (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null check (category in (
    'noise', 'maintenance', 'security', 'infiltration', 'elevator',
    'cleaning', 'heating', 'common_areas', 'pests', 'waste', 'admin', 'other'
  )),
  description text,
  status text not null default 'open' check (status in ('open', 'under_review', 'resolved')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists building_reports_building_id_idx on public.building_reports (building_id);
create index if not exists building_reports_created_at_idx on public.building_reports (created_at);

alter table public.building_reports enable row level security;

-- Gli aggregati (conteggi/categorie) mostrati sulla pagina edificio sono
-- pubblici, come lo score delle recensioni: nessun dato personale nella riga
-- oltre a user_id, che il client non espone in UI.
create policy "building_reports: public read"
  on public.building_reports
  for select
  to anon, authenticated
  using (true);

-- Un utente autenticato può segnalare solo a proprio nome, mai per conto di
-- altri utenti.
create policy "building_reports: self insert"
  on public.building_reports
  for insert
  to authenticated
  with check (user_id = auth.uid());

grant select on public.building_reports to anon, authenticated;
grant insert on public.building_reports to authenticated;
