-- PEC indicata dal residente: convocazioni e verbali gratis via PEC invece della raccomandata.
-- Il residente la salva per sé in un condominio (condo_members.pec). Si applica anche alle
-- righe dell'anagrafe collegate al suo account e ai destinatari ancora da inviare.
-- L'amministratore resta libero di correggerla nell'anagrafe.

alter table public.condo_members add column if not exists pec text
  check (pec is null or (char_length(pec) <= 200 and pec ~* '^[^@\s]+@[^@\s]+\.[a-z]{2,}$'));
alter table public.condo_members add column if not exists pec_updated_at timestamptz;

create or replace function public.get_my_pec(p_building uuid)
returns text language sql stable security definer set search_path = public as $$
  select pec from condo_members where building_id = p_building and user_id = auth.uid()
$$;
revoke all on function public.get_my_pec(uuid) from public, anon;
grant execute on function public.get_my_pec(uuid) to authenticated;

-- p_pec vuota = toglie la PEC (si torna alla raccomandata)
create or replace function public.set_my_pec(p_building uuid, p_pec text)
returns text language plpgsql security definer set search_path = public as $$
declare v text := nullif(lower(trim(coalesce(p_pec, ''))), '');
begin
  if auth.uid() is null or not public.is_member(p_building) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if v is not null and (char_length(v) > 200 or v !~* '^[^@\s]+@[^@\s]+\.[a-z]{2,}$') then
    raise exception 'invalid pec' using errcode = '22023';
  end if;
  update condo_members set pec = v, pec_updated_at = now()
   where building_id = p_building and user_id = auth.uid();
  -- anagrafe: righe collegate al residente
  update condo_unit_people set pec = v
   where building_id = p_building and user_id = auth.uid();
  -- invii non ancora partiti
  update condo_assembly_recipients
     set pec = v, channel = case when v is not null then 'pec' else 'raccomandata' end
   where building_id = p_building and user_id = auth.uid() and status = 'pending' and channel in ('pec', 'raccomandata');
  return v;
end $$;
revoke all on function public.set_my_pec(uuid, text) from public, anon;
grant execute on function public.set_my_pec(uuid, text) to authenticated;

-- Destinatari: PEC dell'anagrafe, altrimenti quella indicata dal residente collegato
create or replace function public.assembly_prepare_recipients(p_assembly uuid, p_purpose text default 'convocation')
returns int language plpgsql security definer set search_path = public as $$
declare a record; b record; n int;
begin
  select * into a from condo_assemblies where id = p_assembly;
  if a.id is null or not public.is_condo_admin(a.building_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_purpose not in ('convocation', 'minutes') then raise exception 'bad purpose'; end if;
  select address, street_number, postal_code, city, province into b from buildings where id = a.building_id;

  insert into condo_assembly_recipients (assembly_id, building_id, purpose, unit_id, person_id, user_id, full_name, channel, pec, postal)
  select a.id, a.building_id, p_purpose, p.unit_id, p.id, p.user_id, p.full_name,
         case when coalesce(p.pec, m.pec) is not null then 'pec' else 'raccomandata' end,
         coalesce(p.pec, m.pec),
         jsonb_build_object(
           'address', coalesce(p.postal_address, concat_ws(' ', b.address, b.street_number) || ' (int. ' || u.code || ')'),
           'cap', coalesce(p.postal_cap, b.postal_code),
           'city', coalesce(p.postal_city, b.city),
           'province', coalesce(p.postal_province, case when char_length(b.province) = 2 then upper(b.province) end)
         )
  from condo_unit_people p
  join condo_units u on u.id = p.unit_id
  left join condo_members m on m.building_id = p.building_id and m.user_id = p.user_id
  where p.building_id = a.building_id and p.role in ('owner', 'bare_owner', 'usufructuary')
    and (p.until is null or p.until >= current_date)
  on conflict (assembly_id, purpose, person_id) do nothing;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.assembly_prepare_recipients(uuid, text) from public, anon;
grant execute on function public.assembly_prepare_recipients(uuid, text) to authenticated;

-- Quando l'amministratore collega un iscritto a un'unità, la sua PEC passa all'anagrafe
create or replace function public.fill_unit_person_pec()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.user_id is not null and new.pec is null then
    select m.pec into new.pec from condo_members m where m.building_id = new.building_id and m.user_id = new.user_id;
  end if;
  return new;
end $$;
revoke all on function public.fill_unit_person_pec() from public, anon, authenticated;
drop trigger if exists condo_unit_people_fill_pec on public.condo_unit_people;
create trigger condo_unit_people_fill_pec before insert or update of user_id on public.condo_unit_people
  for each row execute function public.fill_unit_person_pec();
