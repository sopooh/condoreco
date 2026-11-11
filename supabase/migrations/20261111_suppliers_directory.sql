-- Elenco pubblico dei Recofixer (pagina /fornitori). Solo dati di vetrina:
-- telefono ed email restano leggibili soltanto agli utenti registrati.
create or replace function public.public_suppliers()
returns table (id uuid, company_name text, categories text[], zones text[], description text,
               verified boolean, jobs int, condos int, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select s.id, s.company_name, s.categories, s.zones, s.description, s.verified,
         (select count(*)::int from condo_interventions i join condo_maintainers m on m.id = i.maintainer_id
           where m.supplier_user_id = s.id and i.status = 'done'),
         (select count(distinct m.building_id)::int from condo_maintainers m where m.supplier_user_id = s.id),
         s.created_at
    from suppliers s
   order by s.verified desc, s.company_name
$$;
revoke all on function public.public_suppliers() from public;
grant execute on function public.public_suppliers() to anon, authenticated;
