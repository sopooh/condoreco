-- Condomini clienti del Recofixer: attuali (è tra i fornitori del condominio)
-- ed ex clienti (era tra i fornitori ed è stato tolto).
create table if not exists public.supplier_past_clients (
  supplier_id uuid not null references auth.users(id) on delete cascade,
  building_id uuid not null references public.buildings(id) on delete cascade,
  ended_at timestamptz not null default now(),
  primary key (supplier_id, building_id)
);
alter table public.supplier_past_clients enable row level security;
-- nessuna policy: si legge solo tramite supplier_buildings()

create or replace function public.track_supplier_past_client()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.supplier_user_id is not null
     and (tg_op = 'DELETE' or new.supplier_user_id is distinct from old.supplier_user_id)
     and not exists (select 1 from condo_maintainers m
                      where m.supplier_user_id = old.supplier_user_id and m.building_id = old.building_id and m.id <> old.id) then
    insert into supplier_past_clients (supplier_id, building_id) values (old.supplier_user_id, old.building_id)
    on conflict (supplier_id, building_id) do update set ended_at = now();
  end if;
  return coalesce(new, old);
end $$;

drop trigger if exists condo_maintainers_past_client on public.condo_maintainers;
create trigger condo_maintainers_past_client
  after delete or update of supplier_user_id on public.condo_maintainers
  for each row execute function public.track_supplier_past_client();

create or replace function public.supplier_buildings()
returns table (building_id uuid, is_current boolean)
language sql stable security definer set search_path = public as $$
  select distinct m.building_id, true from condo_maintainers m where m.supplier_user_id = auth.uid()
  union
  select p.building_id, false from supplier_past_clients p
   where p.supplier_id = auth.uid()
     and not exists (select 1 from condo_maintainers m where m.supplier_user_id = auth.uid() and m.building_id = p.building_id)
$$;
revoke all on function public.supplier_buildings() from public, anon;
grant execute on function public.supplier_buildings() to authenticated;
revoke all on function public.track_supplier_past_client() from public, anon, authenticated;
