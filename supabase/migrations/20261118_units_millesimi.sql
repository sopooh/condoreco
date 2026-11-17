-- Elenco unità e tabelle millesimali del condominio.
-- È l'anagrafe ufficiale tenuta dall'amministratore: unità immobiliari,
-- proprietari e inquilini (iscritti a Condoreco o no), tabelle millesimali
-- (A proprietà generale, B scale, C ascensore, ...) e valori per unità.
-- condo_members.millesimi resta il valore dichiarato dal residente in fase di
-- verifica: millesimi_check() lo confronta con l'anagrafe.
-- Privacy: i residenti vedono l'elenco delle unità e i nomi delle tabelle;
-- persone e valori solo per la propria unità. L'amministratore vede tutto.

create table if not exists public.condo_units (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id) on delete cascade,
  code text not null check (char_length(code) between 1 and 30),
  kind text not null default 'apartment'
    check (kind in ('apartment', 'shop', 'office', 'garage', 'cellar', 'attic', 'other')),
  floor text check (floor is null or char_length(floor) <= 10),
  staircase text check (staircase is null or char_length(staircase) <= 20),
  cadastral_ref text check (cadastral_ref is null or char_length(cadastral_ref) <= 80),
  notes text check (notes is null or char_length(notes) <= 500),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (building_id, code)
);
create index if not exists condo_units_building_idx on public.condo_units (building_id);

create table if not exists public.condo_unit_people (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.condo_units(id) on delete cascade,
  building_id uuid not null references public.buildings(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null check (char_length(full_name) between 2 and 120),
  role text not null check (role in ('owner', 'tenant', 'usufructuary', 'bare_owner')),
  share numeric(5,2) not null default 100 check (share > 0 and share <= 100),
  email text check (email is null or char_length(email) <= 200),
  phone text check (phone is null or char_length(phone) <= 40),
  since date,
  until date,
  created_at timestamptz not null default now(),
  check (until is null or since is null or until >= since)
);
create index if not exists condo_unit_people_unit_idx on public.condo_unit_people (unit_id);
create index if not exists condo_unit_people_user_idx on public.condo_unit_people (user_id) where user_id is not null;
create index if not exists condo_unit_people_building_idx on public.condo_unit_people (building_id);

create table if not exists public.condo_millesimi_tables (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id) on delete cascade,
  code text not null check (char_length(code) between 1 and 10),
  name text not null check (char_length(name) between 2 and 80),
  kind text not null default 'other'
    check (kind in ('ownership', 'stairs', 'lift', 'heating', 'water', 'other')),
  total numeric(9,3) not null default 1000 check (total > 0),
  document_id uuid references public.condo_documents(id) on delete set null,
  notes text check (notes is null or char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  unique (building_id, code)
);
-- una sola tabella di proprietà generale per condominio
create unique index if not exists condo_millesimi_tables_one_ownership
  on public.condo_millesimi_tables (building_id) where kind = 'ownership';

create table if not exists public.condo_unit_millesimi (
  table_id uuid not null references public.condo_millesimi_tables(id) on delete cascade,
  unit_id uuid not null references public.condo_units(id) on delete cascade,
  building_id uuid not null references public.buildings(id) on delete cascade,
  value numeric(9,3) not null check (value >= 0),
  primary key (table_id, unit_id)
);
create index if not exists condo_unit_millesimi_unit_idx on public.condo_unit_millesimi (unit_id);

-- Coerenza: building_id delle righe figlie uguale a quello dell'unità / tabella.
create or replace function public.check_unit_building()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from condo_units u where u.id = new.unit_id and u.building_id = new.building_id) then
    raise exception 'unit does not belong to this building' using errcode = '23514';
  end if;
  if tg_table_name = 'condo_unit_millesimi'
     and not exists (select 1 from condo_millesimi_tables t where t.id = new.table_id and t.building_id = new.building_id) then
    raise exception 'table does not belong to this building' using errcode = '23514';
  end if;
  return new;
end $$;
revoke all on function public.check_unit_building() from public, anon, authenticated;

drop trigger if exists condo_unit_people_building on public.condo_unit_people;
create trigger condo_unit_people_building before insert or update on public.condo_unit_people
  for each row execute function public.check_unit_building();
drop trigger if exists condo_unit_millesimi_building on public.condo_unit_millesimi;
create trigger condo_unit_millesimi_building before insert or update on public.condo_unit_millesimi
  for each row execute function public.check_unit_building();

drop trigger if exists condo_units_touch on public.condo_units;
create trigger condo_units_touch before update on public.condo_units
  for each row execute function public.set_updated_at();

-- È una persona (attuale) di quell'unità?
create or replace function public.is_unit_person(p_unit uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from condo_unit_people
                 where unit_id = p_unit and user_id = auth.uid()
                   and (until is null or until >= current_date))
$$;
revoke all on function public.is_unit_person(uuid) from public, anon;
grant execute on function public.is_unit_person(uuid) to authenticated;

alter table public.condo_units enable row level security;
alter table public.condo_unit_people enable row level security;
alter table public.condo_millesimi_tables enable row level security;
alter table public.condo_unit_millesimi enable row level security;
revoke all on public.condo_units, public.condo_unit_people, public.condo_millesimi_tables, public.condo_unit_millesimi from anon;
grant select, insert, update, delete on public.condo_units, public.condo_unit_people, public.condo_millesimi_tables, public.condo_unit_millesimi to authenticated;

-- unità e tabelle: lettura per i membri, scrittura per gli admin
drop policy if exists "units: read members" on public.condo_units;
create policy "units: read members" on public.condo_units for select to authenticated using (public.is_member(building_id));
drop policy if exists "units: admin write" on public.condo_units;
create policy "units: admin write" on public.condo_units for all to authenticated
  using (public.is_condo_admin(building_id)) with check (public.is_condo_admin(building_id));

drop policy if exists "mill tables: read members" on public.condo_millesimi_tables;
create policy "mill tables: read members" on public.condo_millesimi_tables for select to authenticated using (public.is_member(building_id));
drop policy if exists "mill tables: admin write" on public.condo_millesimi_tables;
create policy "mill tables: admin write" on public.condo_millesimi_tables for all to authenticated
  using (public.is_condo_admin(building_id)) with check (public.is_condo_admin(building_id));

-- persone e valori: admin, oppure la propria unità
drop policy if exists "unit people: read" on public.condo_unit_people;
create policy "unit people: read" on public.condo_unit_people for select to authenticated
  using (public.is_condo_admin(building_id) or (public.is_member(building_id) and public.is_unit_person(unit_id)));
drop policy if exists "unit people: admin write" on public.condo_unit_people;
create policy "unit people: admin write" on public.condo_unit_people for all to authenticated
  using (public.is_condo_admin(building_id)) with check (public.is_condo_admin(building_id));

drop policy if exists "unit mill: read" on public.condo_unit_millesimi;
create policy "unit mill: read" on public.condo_unit_millesimi for select to authenticated
  using (public.is_condo_admin(building_id) or (public.is_member(building_id) and public.is_unit_person(unit_id)));
drop policy if exists "unit mill: admin write" on public.condo_unit_millesimi;
create policy "unit mill: admin write" on public.condo_unit_millesimi for all to authenticated
  using (public.is_condo_admin(building_id)) with check (public.is_condo_admin(building_id));

-- Verifica dei millesimi: per ogni iscritto confronta i millesimi dichiarati
-- (condo_members.millesimi) con la tabella di proprietà generale dell'anagrafe,
-- sommando le unità di cui è proprietario per la sua quota. Solo admin.
create or replace function public.millesimi_check(p_building uuid)
returns table (
  user_id uuid, display_name text, declared numeric, registry numeric,
  units text, status text
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_condo_admin(p_building) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query
  with own_table as (
    select id from condo_millesimi_tables where building_id = p_building and kind = 'ownership'
  ),
  reg as (
    select p.user_id,
           sum(um.value * p.share / 100) as registry,
           string_agg(distinct u.code, ', ' order by u.code) as units
    from condo_unit_people p
    join condo_units u on u.id = p.unit_id
    left join condo_unit_millesimi um on um.unit_id = p.unit_id and um.table_id = (select id from own_table)
    where p.building_id = p_building and p.user_id is not null
      and p.role in ('owner', 'bare_owner')
      and (p.until is null or p.until >= current_date)
    group by p.user_id
  )
  select m.user_id, pr.display_name, m.millesimi, round(r.registry, 3), r.units,
         case
           when m.tenure = 'tenant' then 'tenant'
           when r.user_id is null then 'not_linked'
           when m.millesimi is null then 'not_declared'
           when r.registry is null then 'registry_missing'
           when abs(m.millesimi - r.registry) <= 0.01 then 'ok'
           else 'mismatch'
         end
  from condo_members m
  left join profiles pr on pr.id = m.user_id
  left join reg r on r.user_id = m.user_id
  where m.building_id = p_building
  order by pr.display_name nulls last;
end $$;
revoke all on function public.millesimi_check(uuid) from public, anon;
grant execute on function public.millesimi_check(uuid) to authenticated;

-- Iscritti del condominio da collegare a una persona dell'anagrafe (solo admin).
create or replace function public.condo_members_for_linking(p_building uuid)
returns table (user_id uuid, display_name text, floor text, tenure text, millesimi numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_condo_admin(p_building) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query
  select m.user_id, pr.display_name, m.floor, m.tenure, m.millesimi
  from condo_members m left join profiles pr on pr.id = m.user_id
  where m.building_id = p_building
  order by pr.display_name nulls last;
end $$;
revoke all on function public.condo_members_for_linking(uuid) from public, anon;
grant execute on function public.condo_members_for_linking(uuid) to authenticated;

-- user_id in condo_unit_people deve essere un iscritto di quel condominio
create or replace function public.check_unit_person_member()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.user_id is not null
     and not exists (select 1 from condo_members where building_id = new.building_id and user_id = new.user_id) then
    raise exception 'user is not a member of this building' using errcode = '23514';
  end if;
  return new;
end $$;
revoke all on function public.check_unit_person_member() from public, anon, authenticated;
drop trigger if exists condo_unit_people_member on public.condo_unit_people;
create trigger condo_unit_people_member before insert or update of user_id on public.condo_unit_people
  for each row execute function public.check_unit_person_member();
