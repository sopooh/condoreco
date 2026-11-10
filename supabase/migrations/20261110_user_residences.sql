-- Dove abita (o ha abitato) ogni utente, dichiarato con il flusso "Vivo qui"
-- sulla pagina edificio, piu' i dati che il flusso raccoglie. Alimenta
-- "Le mie abitazioni" nel profilo insieme alle recensioni (resident_type).
-- Privata: ogni utente vede e modifica solo le proprie righe.

create table if not exists public.user_residences (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  building_id uuid not null references public.buildings (id) on delete cascade,
  status text not null default 'current' check (status in ('current', 'past')),
  monthly_fee numeric,
  monthly_fee_building numeric,
  is_supercondominio boolean not null default false,
  monthly_fee_super numeric,
  avg_sqm numeric,
  amenities text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, building_id)
);

create index if not exists user_residences_building_idx on public.user_residences (building_id);

alter table public.user_residences enable row level security;

create policy "user_residences: own select"
  on public.user_residences for select to authenticated
  using (user_id = auth.uid());

create policy "user_residences: own insert"
  on public.user_residences for insert to authenticated
  with check (user_id = auth.uid());

create policy "user_residences: own update"
  on public.user_residences for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "user_residences: own delete"
  on public.user_residences for delete to authenticated
  using (user_id = auth.uid());

revoke all on public.user_residences from anon;
grant select, insert, update, delete on public.user_residences to authenticated;

-- updated_at automatico (funzione dedicata, nessuna dipendenza da altre migrazioni)
create or replace function public.user_residences_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists user_residences_set_updated_at on public.user_residences;
create trigger user_residences_set_updated_at
  before update on public.user_residences
  for each row execute function public.user_residences_touch_updated_at();
