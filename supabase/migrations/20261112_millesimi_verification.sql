-- Verifica dei millesimi: il proprietario li dichiara caricando il riparto spese
-- o il regolamento di condominio, con dichiarazione di veridicità. Se sul
-- documento c'è ancora il proprietario precedente (subentro recente) deve
-- indicarne il nome. L'amministratore del condominio (o lo staff Condoreco se
-- non c'è un amministratore) approva o respinge: solo allora i millesimi
-- finiscono in condo_members. Il file viene cancellato appena c'è la decisione.

create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;
revoke all on function public.is_platform_admin() from public, anon;
grant execute on function public.is_platform_admin() to authenticated;

create table if not exists public.millesimi_verifications (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  millesimi numeric(8,3) not null check (millesimi > 0 and millesimi <= 1000),
  document_type text not null check (document_type in ('riparto', 'regolamento')),
  file_path text,
  file_name text check (file_name is null or char_length(file_name) <= 200),
  name_on_document text not null check (name_on_document in ('self', 'previous_owner')),
  previous_owner_name text check (previous_owner_name is null or char_length(previous_owner_name) <= 120),
  attested_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'superseded')),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  reject_reason text check (reject_reason is null or char_length(reject_reason) <= 300),
  created_at timestamptz not null default now(),
  constraint millesimi_prev_owner_required check (
    name_on_document = 'self' or nullif(trim(previous_owner_name), '') is not null
  )
);
create unique index if not exists millesimi_verifications_one_pending
  on public.millesimi_verifications(building_id, user_id) where status = 'pending';
create index if not exists millesimi_verifications_building_idx
  on public.millesimi_verifications(building_id, status, created_at desc);

alter table public.millesimi_verifications enable row level security;
drop policy if exists "millesimi verif: read" on public.millesimi_verifications;
create policy "millesimi verif: read" on public.millesimi_verifications for select to authenticated
  using (user_id = auth.uid() or is_condo_admin(building_id) or is_platform_admin());
grant select on public.millesimi_verifications to authenticated;
-- scritture solo via RPC

-- Bucket privato: <building>/<utente>/<file>
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('millesimi-docs', 'millesimi-docs', false, 10485760, array['application/pdf','image/jpeg','image/png','image/webp','image/heic'])
on conflict (id) do update set public = false, file_size_limit = 10485760, allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.millesimi_file_access(p_name text, p_op text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  parts text[] := string_to_array(p_name, '/');
  uuid_re constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
begin
  if array_length(parts, 1) <> 3 or parts[1] !~ uuid_re or parts[2] !~ uuid_re then return false; end if;
  if p_op = 'write' then return parts[2]::uuid = auth.uid() and is_member(parts[1]::uuid); end if;
  return parts[2]::uuid = auth.uid() or is_condo_admin(parts[1]::uuid) or is_platform_admin();
end $$;
revoke all on function public.millesimi_file_access(text, text) from public, anon;
grant execute on function public.millesimi_file_access(text, text) to authenticated;

drop policy if exists "millesimi files: read" on storage.objects;
create policy "millesimi files: read" on storage.objects for select to authenticated
  using (bucket_id = 'millesimi-docs' and public.millesimi_file_access(name, 'read'));
drop policy if exists "millesimi files: upload" on storage.objects;
create policy "millesimi files: upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'millesimi-docs' and public.millesimi_file_access(name, 'write'));
drop policy if exists "millesimi files: delete" on storage.objects;
create policy "millesimi files: delete" on storage.objects for delete to authenticated
  using (bucket_id = 'millesimi-docs' and public.millesimi_file_access(name, 'delete'));

-- I millesimi in condo_members si possono scrivere solo dall'approvazione
-- (o dall'amministratore del condominio per gli altri condomini). Azzerarli
-- (passaggio a inquilino) resta libero.
create or replace function public.guard_condo_member_millesimi()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.millesimi is null then return new; end if;
  if tg_op = 'UPDATE' and new.millesimi is not distinct from old.millesimi then return new; end if;
  if auth.uid() is null then return new; end if; -- service role / migrazioni
  if coalesce(current_setting('condoreco.millesimi_approved', true), '') = 'on' then return new; end if;
  if is_condo_admin(new.building_id) and new.user_id <> auth.uid() then return new; end if;
  raise exception 'I millesimi si aggiornano solo dopo la verifica del documento' using errcode = '42501';
end $$;
drop trigger if exists guard_condo_member_millesimi on public.condo_members;
create trigger guard_condo_member_millesimi before insert or update of millesimi on public.condo_members
  for each row execute function public.guard_condo_member_millesimi();

-- set_my_unit non scrive più i millesimi: piano e titolo restano liberi,
-- passando a inquilino i millesimi si azzerano.
create or replace function public.set_my_unit(p_building uuid, p_floor text, p_millesimi numeric, p_tenure text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_tenure is not null and p_tenure not in ('owner', 'tenant') then
    raise exception 'invalid tenure' using errcode = '22023';
  end if;
  update condo_members
     set floor = coalesce(nullif(upper(trim(p_floor)), ''), floor),
         millesimi = case when p_tenure = 'tenant' then null else millesimi end,
         tenure = coalesce(p_tenure, tenure)
   where building_id = p_building and user_id = auth.uid();
  if not found then
    raise exception 'not a member of this building' using errcode = '42501';
  end if;
  if p_tenure = 'tenant' then
    update millesimi_verifications set status = 'superseded'
     where building_id = p_building and user_id = auth.uid() and status = 'pending';
  end if;
end $$;

-- Il proprietario invia la richiesta. Restituisce il file della richiesta
-- precedente ancora in attesa (sostituita), che il client cancella.
create or replace function public.submit_millesimi_verification(
  p_building uuid, p_millesimi numeric, p_document_type text, p_path text, p_file_name text,
  p_name_on_document text, p_previous_owner_name text, p_attest boolean
) returns table (verification_id uuid, replaced_path text)
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_old text;
begin
  if auth.uid() is null or not is_member(p_building) then
    raise exception 'Non autorizzato' using errcode = '42501';
  end if;
  if coalesce(p_attest, false) is not true then
    raise exception 'Dichiarazione obbligatoria' using errcode = '22023';
  end if;
  if p_path is null or p_path not like p_building::text || '/' || auth.uid()::text || '/%' then
    raise exception 'Documento obbligatorio' using errcode = '22023';
  end if;

  select file_path into v_old from millesimi_verifications
   where building_id = p_building and user_id = auth.uid() and status = 'pending' for update;
  update millesimi_verifications set status = 'superseded', file_path = null
   where building_id = p_building and user_id = auth.uid() and status = 'pending';

  update condo_members set tenure = 'owner' where building_id = p_building and user_id = auth.uid();

  insert into millesimi_verifications (building_id, user_id, millesimi, document_type, file_path, file_name,
                                       name_on_document, previous_owner_name, attested_at)
  values (p_building, auth.uid(), p_millesimi, p_document_type, p_path, left(p_file_name, 200),
          p_name_on_document,
          case when p_name_on_document = 'previous_owner' then nullif(trim(p_previous_owner_name), '') end,
          now())
  returning id into v_id;

  -- avviso agli amministratori del condominio
  insert into notifications (user_id, building_id, kind, title, body, link)
  select m.user_id, p_building, 'millesimi_review', 'Millesimi da verificare',
         'Un proprietario ha caricato il documento per i suoi millesimi.',
         '/edificio/' || p_building || '/condominio/persone'
    from condo_members m
   where m.building_id = p_building and m.role = 'admin' and m.user_id <> auth.uid();

  return query select v_id, v_old;
end $$;
revoke all on function public.submit_millesimi_verification(uuid, numeric, text, text, text, text, text, boolean) from public, anon;
grant execute on function public.submit_millesimi_verification(uuid, numeric, text, text, text, text, text, boolean) to authenticated;

-- Elenco delle richieste in attesa: per un condominio (amministratore o staff)
-- oppure, con p_building null, quelle che nessun altro amministratore può esaminare (staff).
create or replace function public.millesimi_verifications_pending(p_building uuid default null)
returns table (
  id uuid, building_id uuid, building_label text, user_id uuid, display_name text, floor text,
  millesimi numeric, current_millesimi numeric, document_type text, file_path text, file_name text,
  name_on_document text, previous_owner_name text, created_at timestamptz
) language plpgsql stable security definer set search_path = public as $$
begin
  if p_building is not null then
    if not (is_condo_admin(p_building) or is_platform_admin()) then
      raise exception 'Non autorizzato' using errcode = '42501';
    end if;
  elsif not is_platform_admin() then
    raise exception 'Non autorizzato' using errcode = '42501';
  end if;
  return query
  select v.id, v.building_id,
         concat_ws(', ', concat_ws(' ', b.address, b.street_number), b.city),
         v.user_id, p.display_name, m.floor, v.millesimi, m.millesimi,
         v.document_type, v.file_path, v.file_name, v.name_on_document, v.previous_owner_name, v.created_at
    from millesimi_verifications v
    join buildings b on b.id = v.building_id
    left join profiles p on p.id = v.user_id
    left join condo_members m on m.building_id = v.building_id and m.user_id = v.user_id
   where v.status = 'pending'
     and (case when p_building is not null then v.building_id = p_building
               else not exists (select 1 from condo_members a where a.building_id = v.building_id and a.role = 'admin' and a.user_id <> v.user_id) end)
     and (v.user_id <> auth.uid() or is_platform_admin())
   order by v.created_at;
end $$;
revoke all on function public.millesimi_verifications_pending(uuid) from public, anon;
grant execute on function public.millesimi_verifications_pending(uuid) to authenticated;

-- Approvazione o rifiuto. Restituisce il percorso del file da cancellare.
create or replace function public.review_millesimi_verification(p_id uuid, p_approve boolean, p_reason text default null)
returns text language plpgsql security definer set search_path = public as $$
declare r millesimi_verifications%rowtype;
begin
  select * into r from millesimi_verifications where id = p_id for update;
  if not found or not (is_condo_admin(r.building_id) or is_platform_admin()) then
    raise exception 'Non autorizzato' using errcode = '42501';
  end if;
  if r.user_id = auth.uid() and not is_platform_admin() then
    raise exception 'Non puoi verificare i tuoi millesimi' using errcode = '42501';
  end if;
  if r.status <> 'pending' then
    raise exception 'Richiesta già esaminata' using errcode = '42501';
  end if;
  if not p_approve and nullif(trim(p_reason), '') is null then
    raise exception 'Indica il motivo del rifiuto' using errcode = '22023';
  end if;

  update millesimi_verifications
     set status = case when p_approve then 'approved' else 'rejected' end,
         reviewed_by = auth.uid(), reviewed_at = now(), file_path = null,
         reject_reason = case when p_approve then null else left(trim(p_reason), 300) end
   where id = p_id;

  if p_approve then
    perform set_config('condoreco.millesimi_approved', 'on', true);
    update condo_members set millesimi = r.millesimi, tenure = 'owner'
     where building_id = r.building_id and user_id = r.user_id;
    perform set_config('condoreco.millesimi_approved', '', true);
  end if;

  insert into notifications (user_id, building_id, kind, title, body, link)
  values (r.user_id, r.building_id, 'millesimi_result',
          case when p_approve then 'Millesimi verificati' else 'Millesimi non verificati' end,
          case when p_approve then 'I tuoi ' || replace(trim(to_char(r.millesimi, 'FM9990.099')), '.', ',') || ' millesimi sono stati confermati.'
               else 'Motivo: ' || left(trim(p_reason), 250) end,
          '/edificio/' || r.building_id || '/condominio');

  return r.file_path;
end $$;
revoke all on function public.review_millesimi_verification(uuid, boolean, text) from public, anon;
grant execute on function public.review_millesimi_verification(uuid, boolean, text) to authenticated;
