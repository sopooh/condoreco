-- Area Recofixer: urgenza, squadra di tecnici, riepilogo intervento più ricco.

alter table public.condo_interventions add column if not exists urgent boolean not null default false;

-- Squadra del fornitore (tecnici a cui assegnare gli interventi)
create table if not exists public.supplier_team_members (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null default auth.uid() references public.suppliers(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  role text check (role is null or char_length(role) <= 60),
  phone text check (phone is null or char_length(phone) <= 30),
  created_at timestamptz not null default now()
);
create index if not exists supplier_team_members_supplier_idx on public.supplier_team_members(supplier_id);
alter table public.supplier_team_members enable row level security;
drop policy if exists "team: own" on public.supplier_team_members;
create policy "team: own" on public.supplier_team_members for all to authenticated
  using (supplier_id = auth.uid()) with check (supplier_id = auth.uid());
revoke all on public.supplier_team_members from anon;
grant select, insert, update, delete on public.supplier_team_members to authenticated;

alter table public.condo_interventions add column if not exists supplier_tech_id uuid references public.supplier_team_members(id) on delete set null;

create or replace function public.supplier_assign_tech(p_intervention uuid, p_member uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_intervention_supplier(p_intervention) then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_member is not null and not exists (select 1 from supplier_team_members where id = p_member and supplier_id = auth.uid()) then
    raise exception 'Tecnico non trovato' using errcode = 'P0002';
  end if;
  update condo_interventions set supplier_tech_id = p_member, updated_at = now() where id = p_intervention;
end $$;
revoke all on function public.supplier_assign_tech(uuid, uuid) from public, anon;
grant execute on function public.supplier_assign_tech(uuid, uuid) to authenticated;

-- Elenco interventi del fornitore, con tutto quello che serve alla scheda
drop function if exists public.supplier_interventions();
create or replace function public.supplier_interventions()
returns table (
  id uuid, ref_number int, building_id uuid, building_address text, building_city text, lat double precision, lng double precision,
  title text, category text, description text, location text, status text, urgent boolean,
  scheduled_date date, time_start time, time_end time,
  proposed_date date, proposed_time_start time, proposed_time_end time,
  completion_notes text, completed_at timestamptz, created_at timestamptz, updated_at timestamptz,
  requester text, requester_is_admin boolean, thread_id uuid, message_count int, last_message_at timestamptz,
  tech_id uuid, tech_name text, quote_cents bigint, quote_at timestamptz, invoice_cents bigint, photo_count int, file_count int
) language sql stable security definer set search_path = public as $$
  select i.id, i.ref_number::int, i.building_id,
         b.address || coalesce(', ' || b.street_number, '') || coalesce(' · ' || b.city, ''), b.city, b.lat, b.lng,
         i.title, i.category, i.description, i.location, i.status, i.urgent,
         i.scheduled_date, i.time_start, i.time_end,
         i.proposed_date, i.proposed_time_start, i.proposed_time_end,
         i.completion_notes, i.completed_at, i.created_at, i.updated_at,
         p.display_name,
         exists (select 1 from condo_members cm where cm.building_id = i.building_id and cm.user_id = i.created_by and cm.role = 'admin'),
         t.id,
         (select count(*)::int from condo_thread_messages x where x.thread_id = t.id),
         (select max(x.created_at) from condo_thread_messages x where x.thread_id = t.id),
         i.supplier_tech_id, tm.name,
         (select f.amount_cents from condo_intervention_files f where f.intervention_id = i.id and f.kind = 'quote' order by f.created_at desc limit 1),
         (select max(f.created_at) from condo_intervention_files f where f.intervention_id = i.id and f.kind = 'quote'),
         (select f.amount_cents from condo_intervention_files f where f.intervention_id = i.id and f.kind = 'invoice' order by f.created_at desc limit 1),
         (select count(*)::int from condo_intervention_files f where f.intervention_id = i.id and f.kind = 'photo'),
         (select count(*)::int from condo_intervention_files f where f.intervention_id = i.id)
    from condo_interventions i
    join condo_maintainers m on m.id = i.maintainer_id and m.supplier_user_id = auth.uid()
    join buildings b on b.id = i.building_id
    left join profiles p on p.id = i.created_by
    left join condo_threads t on t.intervention_id = i.id
    left join supplier_team_members tm on tm.id = i.supplier_tech_id
   order by case i.status when 'requested' then 0 when 'scheduled' then 1 else 2 end, i.urgent desc, i.created_at desc
$$;
revoke all on function public.supplier_interventions() from public, anon;
grant execute on function public.supplier_interventions() to authenticated;
