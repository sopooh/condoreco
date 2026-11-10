-- "I tuoi interventi": il residente segnala un problema e contatta
-- direttamente un manutentore, senza passare dall'amministratore.
--  - condo_maintainers: rubrica manutentori del condominio, condivisa tra
--    i membri (chiunque puo' aggiungerne; modifica/elimina autore o admin).
--  - condo_interventions: interventi PRIVATI, visibili solo a chi li ha
--    creati (con descrizione e manutentore).
--  - condo_public_interventions(): per tutti i membri espone SOLO titolo,
--    categoria, data, orario e luogo degli interventi programmati, che cosi
--    compaiono in bacheca e nel calendario il giorno in cui sono fissati.

-- helper: l'utente corrente e' membro del condominio?
create or replace function public.is_condo_member(p_building_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.condo_members m
    where m.building_id = p_building_id and m.user_id = auth.uid()
  );
$$;
revoke all on function public.is_condo_member(uuid) from public, anon;
grant execute on function public.is_condo_member(uuid) to authenticated;

-- ---------------------------------------------------------------- manutentori
create table if not exists public.condo_maintainers (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings (id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  company text,
  category text not null default 'other' check (category in (
    'noise', 'maintenance', 'security', 'infiltration', 'elevator',
    'cleaning', 'heating', 'common_areas', 'pests', 'waste', 'admin', 'other'
  )),
  phone text,
  email text,
  created_at timestamptz not null default now(),
  check (phone is not null or email is not null)
);
create index if not exists condo_maintainers_building_idx on public.condo_maintainers (building_id);
alter table public.condo_maintainers enable row level security;

create policy "condo_maintainers: members read" on public.condo_maintainers
  for select to authenticated using (public.is_condo_member(building_id));
create policy "condo_maintainers: members insert own" on public.condo_maintainers
  for insert to authenticated
  with check (created_by = auth.uid() and public.is_condo_member(building_id));
create policy "condo_maintainers: author or admin update" on public.condo_maintainers
  for update to authenticated
  using (public.is_condo_member(building_id) and (created_by = auth.uid() or exists (
    select 1 from public.condo_members m where m.building_id = condo_maintainers.building_id
      and m.user_id = auth.uid() and m.role = 'admin')))
  with check (public.is_condo_member(building_id));
create policy "condo_maintainers: author or admin delete" on public.condo_maintainers
  for delete to authenticated
  using (created_by = auth.uid() or exists (
    select 1 from public.condo_members m where m.building_id = condo_maintainers.building_id
      and m.user_id = auth.uid() and m.role = 'admin'));

revoke all on public.condo_maintainers from anon;
grant select, insert, delete on public.condo_maintainers to authenticated;
grant update (name, company, category, phone, email) on public.condo_maintainers to authenticated;

-- ---------------------------------------------------------------- interventi
create table if not exists public.condo_interventions (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings (id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  maintainer_id uuid references public.condo_maintainers (id) on delete set null,
  title text not null check (char_length(title) between 3 and 140),
  category text not null default 'maintenance' check (category in (
    'noise', 'maintenance', 'security', 'infiltration', 'elevator',
    'cleaning', 'heating', 'common_areas', 'pests', 'waste', 'admin', 'other'
  )),
  description text,
  location text,
  status text not null default 'requested' check (status in ('requested', 'scheduled', 'done', 'cancelled')),
  scheduled_date date,
  time_start time,
  time_end time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'scheduled' or scheduled_date is not null)
);
create index if not exists condo_interventions_building_date_idx on public.condo_interventions (building_id, scheduled_date);
create index if not exists condo_interventions_author_idx on public.condo_interventions (created_by);
alter table public.condo_interventions enable row level security;

-- solo l'autore, e solo finche' e' membro del condominio
create policy "condo_interventions: author all" on public.condo_interventions
  for all to authenticated
  using (created_by = auth.uid() and public.is_condo_member(building_id))
  with check (created_by = auth.uid() and public.is_condo_member(building_id));

revoke all on public.condo_interventions from anon;
grant select, insert, update, delete on public.condo_interventions to authenticated;

create or replace function public.condo_interventions_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists condo_interventions_touch on public.condo_interventions;
create trigger condo_interventions_touch before update on public.condo_interventions
  for each row execute function public.condo_interventions_touch();

-- vista pubblica per i membri: solo i campi da bacheca/calendario
create or replace function public.condo_public_interventions(p_building_id uuid, p_from date, p_to date)
returns table (
  id uuid, title text, category text, location text, status text,
  scheduled_date date, time_start time, time_end time
)
language sql
stable
security definer
set search_path = public
as $$
  select i.id, i.title, i.category, i.location, i.status, i.scheduled_date, i.time_start, i.time_end
  from public.condo_interventions i
  where i.building_id = p_building_id
    and public.is_condo_member(p_building_id)
    and i.status in ('scheduled', 'done')
    and i.scheduled_date between p_from and p_to
  order by i.scheduled_date, i.time_start nulls first;
$$;
revoke all on function public.condo_public_interventions(uuid, date, date) from public, anon;
grant execute on function public.condo_public_interventions(uuid, date, date) to authenticated;
