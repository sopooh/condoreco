-- Millesimi di proprietà dichiarati dal residente (tabella A, proprietà generale)
alter table public.condo_members add column if not exists millesimi numeric(7,3)
  check (millesimi is null or (millesimi > 0 and millesimi <= 1000));
alter table public.condo_members add column if not exists tenure text
  check (tenure is null or tenure in ('owner', 'tenant'));

-- Il residente aggiorna i propri dati di unità (anche se è admin del condominio:
-- la policy di update self vale solo per il ruolo resident).
create or replace function public.set_my_unit(p_building uuid, p_floor text, p_millesimi numeric, p_tenure text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_tenure is not null and p_tenure not in ('owner', 'tenant') then
    raise exception 'invalid tenure' using errcode = '22023';
  end if;
  if p_tenure = 'owner' and p_millesimi is null then
    raise exception 'millesimi required' using errcode = '22023';
  end if;
  update condo_members
     set floor = coalesce(nullif(upper(trim(p_floor)), ''), floor),
         millesimi = case when p_tenure = 'tenant' then null else coalesce(p_millesimi, millesimi) end,
         tenure = coalesce(p_tenure, tenure)
   where building_id = p_building and user_id = auth.uid();
  if not found then
    raise exception 'not a member of this building' using errcode = '42501';
  end if;
end $$;
revoke all on function public.set_my_unit(uuid, text, numeric, text) from public, anon;
grant execute on function public.set_my_unit(uuid, text, numeric, text) to authenticated;
