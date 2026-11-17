-- Ricerca fornitori dal condominio.
-- Fornitori del condominio (rubrica): contatto diretto.
-- Altri fornitori Condoreco: i residenti possono solo proporli
-- all'amministratore, che decide se aggiungerli alla rubrica.

create table if not exists public.supplier_proposals (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  proposed_by uuid not null references auth.users(id) on delete cascade,
  note text check (note is null or char_length(note) <= 500),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'dismissed')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  unique (building_id, supplier_id, proposed_by)
);
alter table public.supplier_proposals enable row level security;
revoke all on public.supplier_proposals from anon, public, authenticated;

-- Ha un amministratore su Condoreco?
create or replace function public.building_has_admin(p_building uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from condo_members where building_id = p_building and role = 'admin')
$$;
revoke execute on function public.building_has_admin(uuid) from public, anon;
grant execute on function public.building_has_admin(uuid) to authenticated;

-- Ricerca: tutti i fornitori iscritti (non admin), testo libero, con lo
-- stato rispetto al condominio. Niente telefono/email: contatto solo dalla rubrica.
create or replace function public.condo_supplier_search(p_building uuid, p_category text, p_query text)
returns table (id uuid, company_name text, description text, categories text[], zones text[], verified boolean,
               jobs int, in_condo boolean, proposed_by_me boolean, proposals int)
language plpgsql stable security definer set search_path = public as $$
declare q text := nullif(trim(coalesce(p_query, '')), '');
begin
  if not is_member(p_building) then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
  select s.id, s.company_name, left(s.description, 220), s.categories, s.zones, s.verified,
         (select count(*)::int from condo_interventions i join condo_maintainers m on m.id = i.maintainer_id
           where m.supplier_user_id = s.id and i.status = 'done'),
         exists (select 1 from condo_maintainers m where m.building_id = p_building and m.supplier_user_id = s.id),
         exists (select 1 from supplier_proposals sp where sp.building_id = p_building and sp.supplier_id = s.id
                   and sp.proposed_by = auth.uid() and sp.status = 'pending'),
         (select count(*)::int from supplier_proposals sp where sp.building_id = p_building and sp.supplier_id = s.id and sp.status = 'pending')
    from suppliers s
   where (p_category is null or p_category = any(s.categories))
     and not exists (select 1 from profiles p where p.id = s.id and p.role = 'admin')
     and (q is null
          or s.company_name ilike '%' || q || '%'
          or coalesce(s.description, '') ilike '%' || q || '%'
          or exists (select 1 from unnest(s.zones) z where z ilike '%' || q || '%'))
   order by s.verified desc, s.company_name
   limit 60;
end $$;
revoke execute on function public.condo_supplier_search(uuid, text, text) from public, anon;
grant execute on function public.condo_supplier_search(uuid, text, text) to authenticated;

-- Il residente propone un fornitore: notifica agli amministratori.
create or replace function public.propose_supplier(p_building uuid, p_supplier uuid, p_note text)
returns void language plpgsql security definer set search_path = public as $$
declare v_name text; v_who text;
begin
  if not is_member(p_building) then raise exception 'forbidden' using errcode = '42501'; end if;
  select company_name into v_name from suppliers where id = p_supplier;
  if v_name is null then raise exception 'supplier not found' using errcode = 'P0002'; end if;
  if exists (select 1 from condo_maintainers where building_id = p_building and supplier_user_id = p_supplier) then
    return;
  end if;
  insert into supplier_proposals (building_id, supplier_id, proposed_by, note)
  values (p_building, p_supplier, auth.uid(), nullif(trim(coalesce(p_note, '')), ''))
  on conflict (building_id, supplier_id, proposed_by)
  do update set status = 'pending', note = excluded.note, created_at = now(), decided_at = null;
  select coalesce(display_name, 'Un residente') into v_who from profiles where id = auth.uid();
  insert into notifications (user_id, building_id, kind, title, body, link)
  select m.user_id, p_building, 'supplier_proposal', 'Fornitore proposto',
         coalesce(v_who, 'Un residente') || ' propone ' || v_name || ' per il condominio.',
         '/edificio/' || p_building || '/condominio/fornitori'
    from condo_members m where m.building_id = p_building and m.role = 'admin';
end $$;
revoke execute on function public.propose_supplier(uuid, uuid, text) from public, anon;
grant execute on function public.propose_supplier(uuid, uuid, text) to authenticated;

create or replace function public.withdraw_supplier_proposal(p_building uuid, p_supplier uuid)
returns void language sql security definer set search_path = public as $$
  delete from supplier_proposals where building_id = p_building and supplier_id = p_supplier
     and proposed_by = auth.uid() and status = 'pending'
$$;
revoke execute on function public.withdraw_supplier_proposal(uuid, uuid) from public, anon;
grant execute on function public.withdraw_supplier_proposal(uuid, uuid) to authenticated;

-- Proposte in attesa, raggruppate per fornitore (solo amministratore).
create or replace function public.supplier_proposals_for_admin(p_building uuid)
returns table (supplier_id uuid, company_name text, categories text[], zones text[], verified boolean,
               proposals int, proposers text[], notes text[], last_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_condo_admin(p_building) then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
  select s.id, s.company_name, s.categories, s.zones, s.verified, count(*)::int,
         array_agg(coalesce(p.display_name, 'Residente') order by sp.created_at),
         array_remove(array_agg(sp.note order by sp.created_at), null),
         max(sp.created_at)
    from supplier_proposals sp
    join suppliers s on s.id = sp.supplier_id
    left join profiles p on p.id = sp.proposed_by
   where sp.building_id = p_building and sp.status = 'pending'
   group by s.id
   order by max(sp.created_at) desc;
end $$;
revoke execute on function public.supplier_proposals_for_admin(uuid) from public, anon;
grant execute on function public.supplier_proposals_for_admin(uuid) to authenticated;

-- L'amministratore accetta (aggiunge alla rubrica) o ignora.
create or replace function public.decide_supplier_proposal(p_building uuid, p_supplier uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_s suppliers%rowtype; v_name text;
begin
  if not is_condo_admin(p_building) then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into v_s from suppliers where id = p_supplier;
  if not found then raise exception 'supplier not found' using errcode = 'P0002'; end if;
  if p_accept and not exists (select 1 from condo_maintainers where building_id = p_building and supplier_user_id = p_supplier) then
    insert into condo_maintainers (building_id, created_by, name, company, category, phone, email, supplier_user_id)
    values (p_building, auth.uid(), v_s.company_name, v_s.company_name, coalesce(v_s.categories[1], 'other'), v_s.phone, v_s.email, p_supplier);
  end if;
  insert into notifications (user_id, building_id, kind, title, body, link)
  select sp.proposed_by, p_building, 'supplier_proposal',
         case when p_accept then 'Fornitore aggiunto' else 'Proposta non accolta' end,
         case when p_accept then v_s.company_name || ' è ora tra i fornitori del condominio: puoi contattarlo.'
              else 'L''amministratore non ha aggiunto ' || v_s.company_name || ' ai fornitori del condominio.' end,
         '/edificio/' || p_building || '/condominio/fornitori'
    from supplier_proposals sp
   where sp.building_id = p_building and sp.supplier_id = p_supplier and sp.status = 'pending';
  update supplier_proposals set status = case when p_accept then 'accepted' else 'dismissed' end, decided_at = now()
   where building_id = p_building and supplier_id = p_supplier and status = 'pending';
end $$;
revoke execute on function public.decide_supplier_proposal(uuid, uuid, boolean) from public, anon;
grant execute on function public.decide_supplier_proposal(uuid, uuid, boolean) to authenticated;

-- Aggiunta diretta alla rubrica: solo l'amministratore, se il condominio ne ha
-- uno su Condoreco; altrimenti resta aperta ai residenti come prima.
create or replace function public.add_supplier_to_condo(p_building uuid, p_supplier uuid, p_category text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_s suppliers%rowtype; v_id uuid;
begin
  if not public.is_member(p_building) then raise exception 'forbidden' using errcode = '42501'; end if;
  if building_has_admin(p_building) and not is_condo_admin(p_building) then
    raise exception 'admin only' using errcode = '42501';
  end if;
  select * into v_s from suppliers where id = p_supplier;
  if not found then raise exception 'supplier not found' using errcode = 'P0002'; end if;
  select id into v_id from condo_maintainers where building_id = p_building and supplier_user_id = p_supplier
    and (p_category is null or category = p_category) limit 1;
  if v_id is not null then return v_id; end if;
  insert into condo_maintainers (building_id, created_by, name, company, category, phone, email, supplier_user_id)
  values (p_building, auth.uid(), v_s.company_name, v_s.company_name,
          coalesce(p_category, v_s.categories[1], 'other'), v_s.phone, v_s.email, p_supplier)
  returning id into v_id;
  update supplier_proposals set status = 'accepted', decided_at = now()
   where building_id = p_building and supplier_id = p_supplier and status = 'pending';
  return v_id;
end $$;
