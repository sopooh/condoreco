-- Iscrizione collegata all'anagrafe: il condomino indica il codice
-- dell'unita' (es. "Int. 5") e, se vuole, la PEC. Chi approva sceglie
-- l'unita' (o la crea) e il condomino entra subito in condo_unit_people come
-- proprietario o inquilino, con email e PEC gia' compilate.

alter table public.condo_join_requests
  add column if not exists unit_code text check (unit_code is null or char_length(unit_code) <= 30),
  add column if not exists pec text check (pec is null or (char_length(pec) <= 200 and pec ~* '^[^@\s]+@[^@\s]+\.[a-z]{2,}$'));

-- 1) richiesta: due parametri facoltativi in piu'
drop function if exists public.request_condo_join(uuid, text, text, text, numeric, text);
create function public.request_condo_join(
  p_building uuid, p_document_type text, p_document_path text,
  p_floor text, p_millesimi numeric, p_tenure text,
  p_unit_code text default null, p_pec text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_name text;
  v_pec text := nullif(lower(trim(p_pec)), '');
begin
  if v_uid is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  if exists (select 1 from condo_members where building_id = p_building and user_id = v_uid) then
    raise exception 'already a member' using errcode = '23505';
  end if;
  if p_document_path is null or p_document_path not like p_building::text || '/' || v_uid::text || '/%' then
    raise exception 'invalid document path' using errcode = '22023';
  end if;
  if p_tenure is not null and p_tenure not in ('owner', 'tenant') then
    raise exception 'invalid tenure' using errcode = '22023';
  end if;
  if v_pec is not null and (char_length(v_pec) > 200 or v_pec !~* '^[^@\s]+@[^@\s]+\.[a-z]{2,}$') then
    raise exception 'invalid pec' using errcode = '22023';
  end if;

  update condo_join_requests set status = 'withdrawn', reviewed_at = now()
   where building_id = p_building and user_id = v_uid and status = 'pending';

  insert into condo_join_requests (building_id, user_id, document_type, document_path, floor, millesimi, tenure, unit_code, pec)
  values (p_building, v_uid, p_document_type, p_document_path,
          nullif(upper(trim(p_floor)), ''),
          case when p_tenure = 'tenant' then null else p_millesimi end, p_tenure,
          nullif(left(trim(p_unit_code), 30), ''), v_pec)
  returning id into v_id;

  select coalesce(display_name, 'Un utente') into v_name from profiles where id = v_uid;
  perform notify_join_reviewers(p_building, 'Nuova richiesta di accesso',
    coalesce(v_name, 'Un utente') || ' chiede di entrare nell''area condominio.');
  return v_id;
end $$;
revoke all on function public.request_condo_join(uuid, text, text, text, numeric, text, text, text) from public, anon;
grant execute on function public.request_condo_join(uuid, text, text, text, numeric, text, text, text) to authenticated;

-- 2) elenco per chi decide: codice unita', PEC e unita' gia' presente con quel codice
drop function if exists public.pending_join_requests(uuid);
create function public.pending_join_requests(p_building uuid default null)
returns table(id uuid, building_id uuid, building_address text, user_id uuid, display_name text,
              document_type text, document_path text, floor text, millesimi numeric, tenure text,
              created_at timestamptz, ai_check jsonb, unit_code text, pec text, matched_unit_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.building_id, trim(concat_ws(' ', b.address, b.street_number, '·', b.city)),
         r.user_id, p.display_name, r.document_type, r.document_path, r.floor, r.millesimi, r.tenure,
         r.created_at, r.ai_check, r.unit_code, r.pec,
         (select u.id from condo_units u
           where u.building_id = r.building_id and r.unit_code is not null
             and lower(regexp_replace(u.code, '[^a-zA-Z0-9]', '', 'g')) = lower(regexp_replace(r.unit_code, '[^a-zA-Z0-9]', '', 'g'))
           limit 1)
    from condo_join_requests r
    join buildings b on b.id = r.building_id
    left join profiles p on p.id = r.user_id
   where r.status = 'pending'
     and (p_building is null or r.building_id = p_building)
     and public.can_review_join(r.building_id)
   order by r.created_at
$$;
revoke all on function public.pending_join_requests(uuid) from public, anon;
grant execute on function public.pending_join_requests(uuid) to authenticated;

-- 3) approvazione: collega all'anagrafe
--    p_unit: unita' esistente; p_new_unit_code: crea l'unita' se non c'e';
--    p_full_name: nome da usare nell'anagrafe; p_role: titolo (owner, tenant,
--    usufructuary, bare_owner). Senza unita' si comporta come prima.
drop function if exists public.review_condo_join(uuid, boolean, text);
create function public.review_condo_join(
  p_request uuid, p_approve boolean, p_reason text default null,
  p_unit uuid default null, p_new_unit_code text default null,
  p_full_name text default null, p_role text default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  r condo_join_requests;
  v_unit uuid := p_unit;
  v_code text := nullif(left(trim(p_new_unit_code), 30), '');
  v_role text;
  v_name text;
  v_email text;
  v_share numeric;
begin
  select * into r from condo_join_requests where id = p_request for update;
  if not found or r.status <> 'pending' then
    raise exception 'request not pending' using errcode = 'P0002';
  end if;
  if not public.can_review_join(r.building_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  update condo_join_requests
     set status = case when p_approve then 'approved' else 'rejected' end,
         reason = case when p_approve then null else nullif(trim(p_reason), '') end,
         reviewed_by = auth.uid(), reviewed_at = now()
   where id = p_request;

  if p_approve then
    insert into condo_members (building_id, user_id, role, floor, millesimi, tenure, pec, pec_updated_at)
    values (r.building_id, r.user_id, 'resident', r.floor, r.millesimi, r.tenure, r.pec,
            case when r.pec is not null then now() end)
    on conflict (building_id, user_id) do update
      set pec = coalesce(condo_members.pec, excluded.pec),
          pec_updated_at = coalesce(condo_members.pec_updated_at, excluded.pec_updated_at);

    -- collegamento all'anagrafe
    if v_unit is null and v_code is not null then
      select u.id into v_unit from condo_units u where u.building_id = r.building_id and lower(u.code) = lower(v_code);
      if v_unit is null then
        insert into condo_units (building_id, code, floor)
        values (r.building_id, v_code, left(r.floor, 10))
        returning id into v_unit;
      end if;
    end if;

    if v_unit is not null then
      if not exists (select 1 from condo_units u where u.id = v_unit and u.building_id = r.building_id) then
        raise exception 'unit does not belong to this building' using errcode = '23514';
      end if;
      v_role := coalesce(p_role, case when r.tenure = 'tenant' then 'tenant' else 'owner' end);
      if v_role not in ('owner', 'tenant', 'usufructuary', 'bare_owner') then
        raise exception 'invalid role' using errcode = '22023';
      end if;
      select coalesce(nullif(trim(p_full_name), ''), nullif(trim(r.ai_check->>'holder_name'), ''), nullif(trim(p.display_name), ''), 'Condomino')
        into v_name from (select 1) x left join profiles p on p.id = r.user_id;
      v_name := left(v_name, 120);
      if char_length(v_name) < 2 then v_name := 'Condomino'; end if;
      select u.email into v_email from auth.users u where u.id = r.user_id;

      if not exists (select 1 from condo_unit_people cp
                      where cp.unit_id = v_unit and cp.user_id = r.user_id
                        and (cp.until is null or cp.until >= current_date)) then
        -- quota: 100% se e' l'unico titolare, altrimenti la parte non ancora assegnata
        if v_role = 'tenant' then
          v_share := 100;
        else
          select 100 - coalesce(sum(cp.share), 0) into v_share from condo_unit_people cp
           where cp.unit_id = v_unit and cp.role = v_role and (cp.until is null or cp.until >= current_date);
          if v_share <= 0 then v_share := 100; end if;
        end if;
        insert into condo_unit_people (unit_id, building_id, user_id, full_name, role, share, email, pec, since)
        values (v_unit, r.building_id, r.user_id, v_name, v_role, v_share, left(v_email, 200), r.pec, current_date);
      end if;
    end if;

    insert into notifications (user_id, building_id, kind, title, body, link)
    values (r.user_id, r.building_id, 'join_result', 'Richiesta approvata',
            'Ora puoi entrare nell''area del tuo condominio.',
            '/edificio/' || r.building_id || '/condominio');
  else
    insert into notifications (user_id, building_id, kind, title, body, link)
    values (r.user_id, r.building_id, 'join_result', 'Richiesta non approvata',
            coalesce(nullif(trim(p_reason), ''), 'La richiesta di accesso non e'' stata approvata.'),
            '/edificio/' || r.building_id || '/condominio');
  end if;
  return r.document_path;
end $$;
revoke all on function public.review_condo_join(uuid, boolean, text, uuid, text, text, text) from public, anon;
grant execute on function public.review_condo_join(uuid, boolean, text, uuid, text, text, text) to authenticated;
