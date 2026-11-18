-- Nome e cognome legali nell'area condominio: niente nickname. Il nome
-- pubblico delle recensioni (profiles.display_name) resta com'e'; dentro il
-- condominio (anagrafe, persone, richieste di accesso) si usa il nome legale,
-- che l'amministratore confronta con il documento di residenza.

create or replace function public.legal_name_ok(p text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select p is not null
     and char_length(p) between 2 and 60
     and p ~ '^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ'' .-]*[A-Za-zÀ-ÖØ-öø-ÿ.]$'
     and p !~ '(.)\1\1'
$$;

create or replace function public.clean_name(p text)
returns text
language sql
immutable
set search_path = public
as $$ select nullif(regexp_replace(trim(coalesce(p, '')), '\s+', ' ', 'g'), '') $$;

alter table public.condo_join_requests
  add column if not exists first_name text,
  add column if not exists last_name text;
alter table public.condo_members
  add column if not exists first_name text,
  add column if not exists last_name text;

-- richiesta di accesso: nome e cognome obbligatori
drop function if exists public.request_condo_join(uuid, text, text, text, numeric, text, text, text);
create function public.request_condo_join(
  p_building uuid, p_document_type text, p_document_path text,
  p_floor text, p_millesimi numeric, p_tenure text,
  p_unit_code text default null, p_pec text default null,
  p_first_name text default null, p_last_name text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_pec text := nullif(lower(trim(p_pec)), '');
  v_first text := public.clean_name(p_first_name);
  v_last text := public.clean_name(p_last_name);
begin
  if v_uid is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  if exists (select 1 from condo_members where building_id = p_building and user_id = v_uid) then
    raise exception 'already a member' using errcode = '23505';
  end if;
  if not public.legal_name_ok(v_first) or not public.legal_name_ok(v_last) then
    raise exception 'invalid legal name' using errcode = '22023';
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

  insert into condo_join_requests (building_id, user_id, document_type, document_path, floor, millesimi, tenure, unit_code, pec, first_name, last_name)
  values (p_building, v_uid, p_document_type, p_document_path,
          nullif(upper(trim(p_floor)), ''),
          case when p_tenure = 'tenant' then null else p_millesimi end, p_tenure,
          nullif(left(trim(p_unit_code), 30), ''), v_pec, v_first, v_last)
  returning id into v_id;

  perform notify_join_reviewers(p_building, 'Nuova richiesta di accesso',
    v_first || ' ' || v_last || ' chiede di entrare nell''area condominio.');
  return v_id;
end $$;
revoke all on function public.request_condo_join(uuid, text, text, text, numeric, text, text, text, text, text) from public, anon;
grant execute on function public.request_condo_join(uuid, text, text, text, numeric, text, text, text, text, text) to authenticated;

-- elenco per chi decide: nome legale al posto del nickname
drop function if exists public.pending_join_requests(uuid);
create function public.pending_join_requests(p_building uuid default null)
returns table(id uuid, building_id uuid, building_address text, user_id uuid, display_name text,
              document_type text, document_path text, floor text, millesimi numeric, tenure text,
              created_at timestamptz, ai_check jsonb, unit_code text, pec text, matched_unit_id uuid,
              first_name text, last_name text, nickname text)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.building_id, trim(concat_ws(' ', b.address, b.street_number, '·', b.city)),
         r.user_id, coalesce(nullif(concat_ws(' ', r.first_name, r.last_name), ''), p.display_name),
         r.document_type, r.document_path, r.floor, r.millesimi, r.tenure,
         r.created_at, r.ai_check, r.unit_code, r.pec,
         (select u.id from condo_units u
           where u.building_id = r.building_id and r.unit_code is not null
             and lower(regexp_replace(u.code, '[^a-zA-Z0-9]', '', 'g')) = lower(regexp_replace(r.unit_code, '[^a-zA-Z0-9]', '', 'g'))
           limit 1),
         r.first_name, r.last_name, p.display_name
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

create or replace function public.decided_join_requests(p_building uuid default null)
returns table(id uuid, building_id uuid, building_address text, display_name text, document_type text, status text, reason text, floor text, tenure text, created_at timestamptz, reviewed_at timestamptz, reviewer_name text, ai_check jsonb)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.building_id, trim(concat_ws(' ', b.address, b.street_number, '·', b.city)),
         coalesce(nullif(concat_ws(' ', r.first_name, r.last_name), ''), p.display_name),
         r.document_type, r.status, r.reason, r.floor, r.tenure, r.created_at,
         r.reviewed_at, rv.display_name, r.ai_check
    from condo_join_requests r
    join buildings b on b.id = r.building_id
    left join profiles p on p.id = r.user_id
    left join profiles rv on rv.id = r.reviewed_by
   where r.status in ('approved', 'rejected')
     and (p_building is null or r.building_id = p_building)
     and public.can_review_join(r.building_id)
   order by r.reviewed_at desc nulls last
   limit 300
$$;

-- approvazione: copia nome e cognome nel membro; nome anagrafe di default = nome legale
create or replace function public.review_condo_join(
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
    insert into condo_members (building_id, user_id, role, floor, millesimi, tenure, pec, pec_updated_at, first_name, last_name)
    values (r.building_id, r.user_id, 'resident', r.floor, r.millesimi, r.tenure, r.pec,
            case when r.pec is not null then now() end, r.first_name, r.last_name)
    on conflict (building_id, user_id) do update
      set pec = coalesce(condo_members.pec, excluded.pec),
          pec_updated_at = coalesce(condo_members.pec_updated_at, excluded.pec_updated_at),
          first_name = coalesce(condo_members.first_name, excluded.first_name),
          last_name = coalesce(condo_members.last_name, excluded.last_name);

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
      v_name := coalesce(public.clean_name(p_full_name),
                         nullif(concat_ws(' ', r.first_name, r.last_name), ''),
                         public.clean_name(r.ai_check->>'holder_name'),
                         (select public.clean_name(p.display_name) from profiles p where p.id = r.user_id),
                         'Condomino');
      v_name := left(v_name, 120);
      if char_length(v_name) < 2 then v_name := 'Condomino'; end if;
      select u.email into v_email from auth.users u where u.id = r.user_id;

      if not exists (select 1 from condo_unit_people cp
                      where cp.unit_id = v_unit and cp.user_id = r.user_id
                        and (cp.until is null or cp.until >= current_date)) then
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

-- membri gia' iscritti: leggono e completano il proprio nome legale
create or replace function public.get_my_legal_name(p_building uuid)
returns table(first_name text, last_name text)
language sql
stable
security definer
set search_path = public
as $$
  select m.first_name, m.last_name from condo_members m
   where m.building_id = p_building and m.user_id = auth.uid()
$$;
revoke all on function public.get_my_legal_name(uuid) from public, anon;
grant execute on function public.get_my_legal_name(uuid) to authenticated;

create or replace function public.set_my_legal_name(p_building uuid, p_first_name text, p_last_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_first text := public.clean_name(p_first_name);
  v_last text := public.clean_name(p_last_name);
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  if not public.legal_name_ok(v_first) or not public.legal_name_ok(v_last) then
    raise exception 'invalid legal name' using errcode = '22023';
  end if;
  update condo_members set first_name = v_first, last_name = v_last
   where building_id = p_building and user_id = auth.uid();
  if not found then raise exception 'not a member' using errcode = '42501'; end if;
  -- se l'anagrafe lo aveva gia' collegato con un nome provvisorio, lo aggiorna
  update condo_unit_people cp set full_name = left(v_first || ' ' || v_last, 120)
   where cp.building_id = p_building and cp.user_id = auth.uid()
     and (cp.until is null or cp.until >= current_date);
end $$;
revoke all on function public.set_my_legal_name(uuid, text, text) from public, anon;
grant execute on function public.set_my_legal_name(uuid, text, text) to authenticated;

-- elenchi interni al condominio: nome legale quando c'e'
create or replace function public.condo_directory(p_building uuid)
returns table(user_id uuid, display_name text, avatar_url text, floor text, role text)
language sql
stable
security definer
set search_path = public
as $$
  select m.user_id, coalesce(nullif(concat_ws(' ', m.first_name, m.last_name), ''), p.display_name)::text,
         p.avatar_url::text, m.floor, m.role
    from condo_members m left join profiles p on p.id = m.user_id
   where m.building_id = p_building and public.is_member(p_building) and m.user_id <> auth.uid()
   order by 2
$$;

create or replace function public.admin_member_balances(p_building uuid)
returns table(user_id uuid, display_name text, floor text, millesimi numeric, tenure text, ord_total numeric, straord_total numeric, paid numeric, open_amount numeric, overdue numeric, pending integer, last_paid_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select m.user_id, coalesce(nullif(concat_ws(' ', m.first_name, m.last_name), ''), p.display_name),
    m.floor, m.millesimi, m.tenure,
    coalesce(sum(c.amount) filter (where c.kind = 'ordinaria' and c.status <> 'cancelled'), 0),
    coalesce(sum(c.amount) filter (where c.kind = 'straordinaria' and c.status <> 'cancelled'), 0),
    coalesce(sum(c.amount) filter (where c.status = 'paid'), 0),
    coalesce(sum(c.amount) filter (where c.status in ('open', 'pending')), 0),
    coalesce(sum(c.amount) filter (where c.status in ('open', 'pending') and c.due_date < current_date), 0),
    (count(*) filter (where c.status = 'pending'))::int,
    max(c.paid_at)
  from condo_members m
  join profiles p on p.id = m.user_id
  left join condo_charges c on c.building_id = m.building_id and c.user_id = m.user_id
  where m.building_id = p_building and m.role <> 'admin' and is_condo_admin(p_building)
  group by m.user_id, m.first_name, m.last_name, p.display_name, m.floor, m.millesimi, m.tenure
  order by 2
$$;

create or replace function public.condo_members_for_linking(p_building uuid)
returns table(user_id uuid, display_name text, floor text, tenure text, millesimi numeric)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_condo_admin(p_building) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query
  select m.user_id, coalesce(nullif(concat_ws(' ', m.first_name, m.last_name), ''), pr.display_name), m.floor, m.tenure, m.millesimi
  from condo_members m left join profiles pr on pr.id = m.user_id
  where m.building_id = p_building
  order by 2 nulls last;
end $$;
