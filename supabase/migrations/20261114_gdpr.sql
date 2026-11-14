-- GDPR: adeguamento area condominio, diritti degli interessati, conservazione.
-- Vedi audit GDPR del 11/11/2026.
--
-- 1. condo_members: niente piu' auto-iscrizione (la verifica era simulata e
--    chiunque poteva entrare in qualsiasi condominio); lettura limitata alla
--    propria riga o all'admin del condominio (minimizzazione: i vicini
--    passano gia' dalla RPC condo_directory).
-- 2. condo_join_requests + bucket privato residence-docs: richiesta di accesso
--    con documento, approvata dall'admin del condominio o, se il condominio
--    non ha admin, dallo staff Condoreco. Il documento si cancella appena la
--    richiesta e' decisa.
-- 3. privacy_requests: richieste degli interessati (artt. 15-22), scadenza 30gg.
-- 4. export_my_data(): portabilita', JSON con tutte le righe collegate all'utente.
-- 5. admin_erase_user(): cancellazione account eseguita dallo staff.
-- 6. gdpr_retention_cleanup() + cron notturno: conservazione 12 mesi per log.
-- 7. building-photos: delete solo autore o staff (prima: qualsiasi utente).

-- ---------------------------------------------------------------------------
-- 1. condo_members
-- ---------------------------------------------------------------------------
drop policy if exists "condo_members: self enroll as resident" on public.condo_members;
drop policy if exists "members_select" on public.condo_members;
drop policy if exists "condo_members: select own row" on public.condo_members;

create policy "condo_members: select own or condo admin"
  on public.condo_members for select to authenticated
  using (user_id = auth.uid() or public.is_condo_admin(building_id) or public.is_admin());

-- ---------------------------------------------------------------------------
-- 2. Richieste di accesso al condominio
-- ---------------------------------------------------------------------------
create table if not exists public.condo_join_requests (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'withdrawn')),
  document_type text check (document_type in ('certificato', 'affitto', 'rogito', 'bolletta')),
  document_path text,
  floor text,
  millesimi numeric,
  tenure text check (tenure in ('owner', 'tenant')),
  reason text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists condo_join_requests_one_pending
  on public.condo_join_requests (building_id, user_id) where status = 'pending';
create index if not exists condo_join_requests_building on public.condo_join_requests (building_id, status);

alter table public.condo_join_requests enable row level security;

-- chi puo' decidere: admin del condominio; staff solo se il condominio non ha admin
create or replace function public.can_review_join(p_building uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_condo_admin(p_building)
      or (public.is_admin() and not exists (
            select 1 from condo_members where building_id = p_building and role = 'admin'))
$$;

drop policy if exists "join_requests: own read" on public.condo_join_requests;
create policy "join_requests: own read" on public.condo_join_requests
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "join_requests: reviewer read" on public.condo_join_requests;
create policy "join_requests: reviewer read" on public.condo_join_requests
  for select to authenticated using (public.can_review_join(building_id));
-- nessuna insert/update diretta: tutto passa dalle RPC sotto

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('residence-docs', 'residence-docs', false, 10485760,
        array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- percorso: <building_id>/<user_id>/<file>
drop policy if exists "residence docs: upload own" on storage.objects;
create policy "residence docs: upload own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'residence-docs' and (storage.foldername(name))[2] = auth.uid()::text);

drop policy if exists "residence docs: read" on storage.objects;
create policy "residence docs: read" on storage.objects
  for select to authenticated
  using (bucket_id = 'residence-docs' and (
    (storage.foldername(name))[2] = auth.uid()::text
    or exists (select 1 from public.condo_join_requests r
                where r.document_path = objects.name and r.status = 'pending'
                  and public.can_review_join(r.building_id))));

drop policy if exists "residence docs: delete" on storage.objects;
create policy "residence docs: delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'residence-docs' and (
    (storage.foldername(name))[2] = auth.uid()::text
    or exists (select 1 from public.condo_join_requests r
                where r.document_path = objects.name
                  and public.can_review_join(r.building_id))));

-- notifica ai revisori del condominio (admin condominio, altrimenti staff)
create or replace function public.notify_join_reviewers(p_building uuid, p_title text, p_body text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if exists (select 1 from condo_members where building_id = p_building and role = 'admin') then
    insert into notifications (user_id, building_id, kind, title, body, link)
    select m.user_id, p_building, 'join_request', p_title, p_body,
           '/edificio/' || p_building || '/condominio/richieste'
      from condo_members m where m.building_id = p_building and m.role = 'admin';
  else
    insert into notifications (user_id, building_id, kind, title, body, link)
    select p.id, p_building, 'join_request', p_title, p_body, '/admin?sezione=richieste'
      from profiles p where p.role = 'admin';
  end if;
end $$;
revoke execute on function public.notify_join_reviewers(uuid, text, text) from public, anon, authenticated;

create or replace function public.request_condo_join(
  p_building uuid, p_document_type text, p_document_path text,
  p_floor text, p_millesimi numeric, p_tenure text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_name text;
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

  -- una sola richiesta aperta: quella precedente viene ritirata
  update condo_join_requests set status = 'withdrawn', reviewed_at = now()
   where building_id = p_building and user_id = v_uid and status = 'pending';

  insert into condo_join_requests (building_id, user_id, document_type, document_path, floor, millesimi, tenure)
  values (p_building, v_uid, p_document_type, p_document_path,
          nullif(upper(trim(p_floor)), ''),
          case when p_tenure = 'tenant' then null else p_millesimi end, p_tenure)
  returning id into v_id;

  select coalesce(display_name, 'Un utente') into v_name from profiles where id = v_uid;
  perform notify_join_reviewers(p_building, 'Nuova richiesta di accesso',
    coalesce(v_name, 'Un utente') || ' chiede di entrare nell''area condominio.');
  return v_id;
end $$;

create or replace function public.withdraw_condo_join(p_request uuid)
returns text
language plpgsql security definer set search_path = public
as $$
declare v_path text;
begin
  update condo_join_requests set status = 'withdrawn', reviewed_at = now()
   where id = p_request and user_id = auth.uid() and status = 'pending'
  returning document_path into v_path;
  if not found then raise exception 'request not found' using errcode = 'P0002'; end if;
  return v_path; -- il client cancella il file dallo storage
end $$;

create or replace function public.review_condo_join(p_request uuid, p_approve boolean, p_reason text default null)
returns text
language plpgsql security definer set search_path = public
as $$
declare r condo_join_requests;
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
    insert into condo_members (building_id, user_id, role, floor, millesimi, tenure)
    values (r.building_id, r.user_id, 'resident', r.floor, r.millesimi, r.tenure)
    on conflict (building_id, user_id) do nothing;
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
  return r.document_path; -- il client del revisore cancella subito il file
end $$;

-- dopo la cancellazione del file dallo storage il percorso non serve piu'
create or replace function public.clear_join_document(p_request uuid)
returns void
language sql security definer set search_path = public
as $$
  update condo_join_requests set document_path = null
   where id = p_request and status <> 'pending'
     and (user_id = auth.uid() or public.can_review_join(building_id))
$$;

create or replace function public.pending_join_requests(p_building uuid default null)
returns table (id uuid, building_id uuid, building_address text, user_id uuid, display_name text,
               document_type text, document_path text, floor text, millesimi numeric, tenure text,
               created_at timestamptz)
language sql stable security definer set search_path = public
as $$
  select r.id, r.building_id, trim(concat_ws(' ', b.address, b.street_number, '·', b.city)),
         r.user_id, p.display_name, r.document_type, r.document_path, r.floor, r.millesimi, r.tenure, r.created_at
    from condo_join_requests r
    join buildings b on b.id = r.building_id
    left join profiles p on p.id = r.user_id
   where r.status = 'pending'
     and (p_building is null or r.building_id = p_building)
     and public.can_review_join(r.building_id)
   order by r.created_at
$$;

-- ---------------------------------------------------------------------------
-- 3. Richieste privacy
-- ---------------------------------------------------------------------------
create table if not exists public.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text,
  kind text not null check (kind in ('erasure', 'rectification', 'objection', 'restriction', 'access', 'other')),
  message text,
  status text not null default 'open' check (status in ('open', 'done', 'rejected')),
  response text,
  created_at timestamptz not null default now(),
  due_at timestamptz not null default now() + interval '30 days',
  handled_at timestamptz,
  handled_by uuid references auth.users(id) on delete set null
);
alter table public.privacy_requests enable row level security;

drop policy if exists "privacy_requests: own read" on public.privacy_requests;
create policy "privacy_requests: own read" on public.privacy_requests
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "privacy_requests: staff read" on public.privacy_requests;
create policy "privacy_requests: staff read" on public.privacy_requests
  for select to authenticated using (public.is_admin());

create or replace function public.submit_privacy_request(p_kind text, p_message text default null)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_id uuid; v_email text;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  if exists (select 1 from privacy_requests where user_id = auth.uid() and kind = p_kind and status = 'open') then
    raise exception 'request already open' using errcode = '23505';
  end if;
  select email into v_email from auth.users where id = auth.uid();
  insert into privacy_requests (user_id, email, kind, message)
  values (auth.uid(), v_email, p_kind, nullif(trim(p_message), ''))
  returning id into v_id;
  insert into notifications (user_id, kind, title, body, link)
  select p.id, 'privacy_request', 'Nuova richiesta privacy',
         'Da gestire entro il ' || to_char(now() + interval '30 days', 'DD/MM/YYYY') || '.',
         '/admin?sezione=privacy'
    from profiles p where p.role = 'admin';
  return v_id;
end $$;

create or replace function public.handle_privacy_request(p_request uuid, p_status text, p_response text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare r privacy_requests;
begin
  if not public.is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_status not in ('done', 'rejected', 'open') then raise exception 'invalid status' using errcode = '22023'; end if;
  update privacy_requests
     set status = p_status, response = nullif(trim(p_response), ''),
         handled_at = case when p_status = 'open' then null else now() end,
         handled_by = case when p_status = 'open' then null else auth.uid() end
   where id = p_request returning * into r;
  if r.user_id is not null and p_status <> 'open' then
    insert into notifications (user_id, kind, title, body, link)
    values (r.user_id, 'privacy_result',
            case when p_status = 'done' then 'Richiesta privacy evasa' else 'Richiesta privacy non accolta' end,
            coalesce(nullif(trim(p_response), ''), 'Controlla la sezione Privacy e dati del profilo.'),
            '/profilo?sezione=privacy');
  end if;
end $$;

create or replace function public.admin_privacy_requests()
returns table (id uuid, user_id uuid, email text, display_name text, kind text, message text,
               status text, response text, created_at timestamptz, due_at timestamptz, handled_at timestamptz)
language sql stable security definer set search_path = public
as $$
  select r.id, r.user_id, r.email, p.display_name, r.kind, r.message, r.status, r.response,
         r.created_at, r.due_at, r.handled_at
    from privacy_requests r left join profiles p on p.id = r.user_id
   where public.is_admin()
   order by (r.status = 'open') desc, r.due_at
$$;

-- ---------------------------------------------------------------------------
-- 4. Export dati (art. 15 e 20)
-- ---------------------------------------------------------------------------
create or replace function public.export_my_data()
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_out jsonb;
  v_rows jsonb;
  rec record;
begin
  if v_uid is null then raise exception 'not authenticated' using errcode = '42501'; end if;

  select jsonb_build_object(
           'generato_il', now(),
           'titolare', 'Sophie Perazzolo (Condoreco), hello@condoreco.com',
           'account', jsonb_build_object('id', u.id, 'email', u.email, 'created_at', u.created_at,
                                         'last_sign_in_at', u.last_sign_in_at))
    into v_out from auth.users u where u.id = v_uid;

  -- ogni tabella public con una colonna che punta all'utente (auth.users o profiles)
  for rec in
    select distinct c.conrelid::regclass::text as tbl, a.attname as col
      from pg_constraint c
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
      join pg_class k on k.oid = c.conrelid
      join pg_namespace n on n.oid = k.relnamespace
     where c.contype = 'f' and n.nspname = 'public'
       and c.confrelid in ('auth.users'::regclass, 'public.profiles'::regclass)
       and k.relname not in ('ig_posts')
     order by 1, 2
  loop
    execute format('select coalesce(jsonb_agg(to_jsonb(t)), ''[]''::jsonb) from %s t where %I = $1', rec.tbl, rec.col)
      into v_rows using v_uid;
    if jsonb_array_length(v_rows) > 0 then
      v_out := jsonb_set(v_out, array[rec.tbl || '.' || rec.col], v_rows, true);
    end if;
  end loop;
  return v_out;
end $$;

-- ---------------------------------------------------------------------------
-- 5. Cancellazione account (eseguita dallo staff)
-- ---------------------------------------------------------------------------
create or replace function public.admin_erase_user(p_user uuid)
returns void
language plpgsql security definer set search_path = public, auth
as $$
begin
  if not public.is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_user = auth.uid() then raise exception 'cannot erase yourself' using errcode = '22023'; end if;
  update public.privacy_requests
     set status = 'done', handled_at = now(), handled_by = auth.uid(), email = null,
         response = coalesce(response, 'Account cancellato')
   where user_id = p_user and status = 'open';
  -- log e richieste non servono piu': via prima della cancellazione
  delete from public.login_events where user_id = p_user;
  delete from public.page_views where user_id = p_user;
  delete from public.condo_join_requests where user_id = p_user;
  begin
    delete from auth.users where id = p_user;
  exception when foreign_key_violation then
    raise exception 'Account collegato a contenuti condivisi (%). Rimuovili o riassegnali prima di cancellare.',
      sqlerrm using errcode = '23503';
  end;
end $$;

-- ---------------------------------------------------------------------------
-- 6. Conservazione
-- ---------------------------------------------------------------------------
create or replace function public.gdpr_retention_cleanup()
returns void
language plpgsql security definer set search_path = public
as $$
begin
  delete from login_events where created_at < now() - interval '12 months';
  delete from page_views where created_at < now() - interval '12 months';
  delete from notifications where read_at is not null and read_at < now() - interval '12 months';
  delete from condo_join_requests where status <> 'pending' and reviewed_at < now() - interval '12 months';
  delete from privacy_requests where status <> 'open' and handled_at < now() - interval '24 months';
end $$;
revoke execute on function public.gdpr_retention_cleanup() from public, anon, authenticated;

select cron.unschedule('gdpr-retention-cleanup')
 where exists (select 1 from cron.job where jobname = 'gdpr-retention-cleanup');
select cron.schedule('gdpr-retention-cleanup', '17 3 * * *', 'select public.gdpr_retention_cleanup()');

-- ---------------------------------------------------------------------------
-- 7. building-photos: delete solo autore o staff
-- ---------------------------------------------------------------------------
drop policy if exists "building_photos_delete" on storage.objects;
create policy "building_photos_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'building-photos' and (owner = auth.uid() or public.is_admin()));

-- permessi RPC: solo utenti autenticati
revoke execute on function public.request_condo_join(uuid, text, text, text, numeric, text) from public, anon;
grant execute on function public.request_condo_join(uuid, text, text, text, numeric, text) to authenticated;
revoke execute on function public.withdraw_condo_join(uuid) from public, anon;
grant execute on function public.withdraw_condo_join(uuid) to authenticated;
revoke execute on function public.review_condo_join(uuid, boolean, text) from public, anon;
grant execute on function public.review_condo_join(uuid, boolean, text) to authenticated;
revoke execute on function public.clear_join_document(uuid) from public, anon;
grant execute on function public.clear_join_document(uuid) to authenticated;
revoke execute on function public.pending_join_requests(uuid) from public, anon;
grant execute on function public.pending_join_requests(uuid) to authenticated;
revoke execute on function public.submit_privacy_request(text, text) from public, anon;
grant execute on function public.submit_privacy_request(text, text) to authenticated;
revoke execute on function public.handle_privacy_request(uuid, text, text) from public, anon;
grant execute on function public.handle_privacy_request(uuid, text, text) to authenticated;
revoke execute on function public.admin_privacy_requests() from public, anon;
grant execute on function public.admin_privacy_requests() to authenticated;
revoke execute on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;
revoke execute on function public.admin_erase_user(uuid) from public, anon;
grant execute on function public.admin_erase_user(uuid) to authenticated;
revoke execute on function public.can_review_join(uuid) from public, anon;
grant execute on function public.can_review_join(uuid) to authenticated;
