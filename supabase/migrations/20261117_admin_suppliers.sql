-- Fornitori Recofixer con cui lavora un amministratore: quelli nella rubrica
-- dei condomini che amministra. Pubblico come la directory fornitori.
create or replace function public.admin_suppliers(p_admin uuid)
returns table (id uuid, company_name text, categories text[], zones text[], verified boolean, condos int)
language sql stable security definer set search_path = public as $$
  select s.id, s.company_name, s.categories, s.zones, s.verified, count(distinct m.building_id)::int
    from condo_maintainers m
    join buildings b on b.id = m.building_id and b.administrator_id = p_admin
    join suppliers s on s.id = m.supplier_user_id
   where not exists (select 1 from profiles p where p.id = s.id and p.role = 'admin')
   group by s.id
   order by count(distinct m.building_id) desc, s.company_name
   limit 50
$$;
revoke all on function public.admin_suppliers(uuid) from public;
grant execute on function public.admin_suppliers(uuid) to anon, authenticated;
