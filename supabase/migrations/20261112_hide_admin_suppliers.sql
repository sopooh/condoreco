-- I profili Recofixer di prova degli amministratori del sito non compaiono negli elenchi pubblici
create or replace function public.public_suppliers()
 returns table(id uuid, company_name text, categories text[], zones text[], description text, verified boolean, jobs integer, condos integer, created_at timestamptz)
 language sql stable security definer set search_path to 'public'
as $$
  select s.id, s.company_name, s.categories, s.zones, s.description, s.verified,
         (select count(*)::int from condo_interventions i join condo_maintainers m on m.id = i.maintainer_id
           where m.supplier_user_id = s.id and i.status = 'done'),
         (select count(distinct m.building_id)::int from condo_maintainers m where m.supplier_user_id = s.id),
         s.created_at
    from suppliers s
   where not exists (select 1 from profiles p where p.id = s.id and p.role = 'admin')
   order by s.verified desc, s.company_name
$$;

create or replace function public.search_suppliers(p_category text, p_city text)
 returns table(id uuid, company_name text, categories text[], zones text[], verified boolean, jobs integer)
 language sql stable security definer set search_path to 'public'
as $$
  select s.id, s.company_name, s.categories, s.zones, s.verified,
         (select count(*)::int from condo_interventions i join condo_maintainers m on m.id = i.maintainer_id
           where m.supplier_user_id = s.id and i.status = 'done')
    from suppliers s
   where (p_category is null or p_category = any(s.categories))
     and (p_city is null or exists (select 1 from unnest(s.zones) z where lower(z) = lower(p_city)) or cardinality(s.zones) = 0)
     and not exists (select 1 from profiles p where p.id = s.id and p.role = 'admin')
   order by s.verified desc, s.company_name
   limit 30
$$;
