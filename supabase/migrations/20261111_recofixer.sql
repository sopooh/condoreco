-- Recofixer: profilo fornitore.
-- Il fornitore ha un account (profiles.role = 'condofixer') e una scheda
-- pubblica in public.suppliers. I condomini lo collegano alla propria rubrica
-- (condo_maintainers.supplier_user_id) con un invito o cercandolo tra gli
-- iscritti. Da lì vede solo gli interventi in cui è scelto: partecipa alla
-- chat, propone la data, carica preventivo e fattura, segna completato.

-- 1. Ruolo
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role = any (array['condoranker', 'condoranked', 'condofixer', 'admin']));

-- 2. Scheda fornitore
create table if not exists public.suppliers (
  id uuid primary key references auth.users(id) on delete cascade,
  company_name text not null check (char_length(company_name) between 2 and 120),
  vat_number text check (vat_number is null or vat_number ~ '^[0-9]{11}$'),
  categories text[] not null default '{}',
  zones text[] not null default '{}',
  phone text,
  email text,
  description text check (description is null or char_length(description) <= 600),
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.suppliers enable row level security;
drop policy if exists "suppliers: logged read" on public.suppliers;
create policy "suppliers: logged read" on public.suppliers for select to authenticated using (true);
drop policy if exists "suppliers: own write" on public.suppliers;
create policy "suppliers: own write" on public.suppliers for insert to authenticated with check (id = auth.uid());
drop policy if exists "suppliers: own update" on public.suppliers;
create policy "suppliers: own update" on public.suppliers for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
revoke all on public.suppliers from anon;
revoke update on public.suppliers from authenticated;
grant select, insert on public.suppliers to authenticated;
grant update (company_name, vat_number, categories, zones, phone, email, description, updated_at) on public.suppliers to authenticated;

-- 3. Collegamento rubrica <-> account e inviti
alter table public.condo_maintainers add column if not exists supplier_user_id uuid references auth.users(id) on delete set null;
alter table public.condo_maintainers add column if not exists invite_token uuid unique;
create index if not exists condo_maintainers_supplier_idx on public.condo_maintainers (supplier_user_id);

-- 4. Interventi: proposta di data e chiusura da parte del fornitore
alter table public.condo_interventions add column if not exists proposed_date date;
alter table public.condo_interventions add column if not exists proposed_time_start time;
alter table public.condo_interventions add column if not exists proposed_time_end time;
alter table public.condo_interventions add column if not exists completion_notes text;
alter table public.condo_interventions add column if not exists completed_at timestamptz;
alter table public.condo_interventions add column if not exists completed_by uuid;

create or replace function public.is_intervention_supplier(p_intervention uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from condo_interventions i join condo_maintainers m on m.id = i.maintainer_id
                  where i.id = p_intervention and m.supplier_user_id = auth.uid())
$$;

-- 5. Chat: il fornitore fa parte della chat dei suoi interventi
create or replace function public.is_thread_member(p_thread uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from condo_thread_members tm join condo_threads t on t.id = tm.thread_id
     where tm.thread_id = p_thread and tm.user_id = auth.uid()
       and (public.is_member(t.building_id)
            or (t.kind = 'intervention' and public.is_intervention_supplier(t.intervention_id))))
$$;

-- aggiunge il fornitore (se ha un account) alla chat dell'intervento
create or replace function public.sync_intervention_supplier(p_intervention uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_thread uuid; v_supplier uuid;
begin
  select t.id, m.supplier_user_id into v_thread, v_supplier
    from condo_interventions i
    join condo_maintainers m on m.id = i.maintainer_id
    left join condo_threads t on t.intervention_id = i.id
   where i.id = p_intervention;
  if v_supplier is null then return; end if;
  if v_thread is null then
    insert into condo_threads (building_id, kind, intervention_id, title, created_by)
    select i.building_id, 'intervention', i.id, i.title, i.created_by from condo_interventions i where i.id = p_intervention
    returning id into v_thread;
    insert into condo_thread_members (thread_id, user_id, added_by)
    select v_thread, i.created_by, i.created_by from condo_interventions i where i.id = p_intervention;
  end if;
  insert into condo_thread_members (thread_id, user_id, added_by) values (v_thread, v_supplier, v_supplier)
  on conflict do nothing;
end $$;
revoke all on function public.sync_intervention_supplier(uuid) from public, anon, authenticated;

create or replace function public.condo_interventions_supplier_sync()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.maintainer_id is not null and (tg_op = 'INSERT' or new.maintainer_id is distinct from old.maintainer_id) then
    perform public.sync_intervention_supplier(new.id);
  end if;
  return new;
end $$;
drop trigger if exists condo_interventions_supplier_sync on public.condo_interventions;
create trigger condo_interventions_supplier_sync after insert or update of maintainer_id on public.condo_interventions
  for each row execute function public.condo_interventions_supplier_sync();
revoke all on function public.condo_interventions_supplier_sync() from public, anon, authenticated;

-- quando un fornitore si collega a una voce della rubrica, entra nelle chat
-- degli interventi già aperti con quella voce
create or replace function public.condo_maintainers_supplier_sync()
returns trigger language plpgsql security definer set search_path = public as $$
declare r record;
begin
  if new.supplier_user_id is not null and new.supplier_user_id is distinct from old.supplier_user_id then
    for r in select id from condo_interventions where maintainer_id = new.id and status in ('requested', 'scheduled') loop
      perform public.sync_intervention_supplier(r.id);
    end loop;
  end if;
  return new;
end $$;
drop trigger if exists condo_maintainers_supplier_sync on public.condo_maintainers;
create trigger condo_maintainers_supplier_sync after update of supplier_user_id on public.condo_maintainers
  for each row execute function public.condo_maintainers_supplier_sync();
revoke all on function public.condo_maintainers_supplier_sync() from public, anon, authenticated;

-- open_intervention_thread: ora include anche il fornitore
create or replace function public.open_intervention_thread(p_intervention uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_int condo_interventions%rowtype;
  v_id uuid;
begin
  select * into v_int from condo_interventions where id = p_intervention;
  if not found then raise exception 'not found' using errcode = 'P0002'; end if;
  select id into v_id from condo_threads where intervention_id = p_intervention;
  if v_id is not null then
    if not public.is_thread_member(v_id) then raise exception 'forbidden' using errcode = '42501'; end if;
    return v_id;
  end if;
  if v_int.created_by <> auth.uid() or not public.is_member(v_int.building_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  insert into condo_threads (building_id, kind, intervention_id, title, created_by)
  values (v_int.building_id, 'intervention', p_intervention, v_int.title, auth.uid())
  returning id into v_id;
  insert into condo_thread_members (thread_id, user_id, added_by) values (v_id, auth.uid(), auth.uid());
  perform public.sync_intervention_supplier(p_intervention);
  return v_id;
end $$;

-- 6. Inviti
create or replace function public.create_supplier_invite(p_maintainer uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_tok uuid; v_b uuid;
begin
  select building_id, invite_token into v_b, v_tok from condo_maintainers where id = p_maintainer;
  if v_b is null or not public.is_member(v_b) then raise exception 'forbidden' using errcode = '42501'; end if;
  if v_tok is null then
    v_tok := gen_random_uuid();
    update condo_maintainers set invite_token = v_tok where id = p_maintainer;
  end if;
  return v_tok;
end $$;

-- dati dell'invito, leggibili prima del login (solo nome e condominio)
create or replace function public.supplier_invite_info(p_token uuid)
returns table (maintainer_name text, company text, category text, building_address text, claimed boolean)
language sql stable security definer set search_path = public as $$
  select m.name, m.company, m.category,
         b.address || coalesce(', ' || b.street_number, '') || coalesce(' · ' || b.city, ''),
         m.supplier_user_id is not null
    from condo_maintainers m join buildings b on b.id = m.building_id
   where m.invite_token = p_token
$$;

create or replace function public.claim_supplier_invite(p_token uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_m condo_maintainers%rowtype;
begin
  if not exists (select 1 from suppliers where id = auth.uid()) then
    raise exception 'complete supplier profile first' using errcode = '42501';
  end if;
  select * into v_m from condo_maintainers where invite_token = p_token for update;
  if not found then raise exception 'invite not found' using errcode = 'P0002'; end if;
  if v_m.supplier_user_id is not null and v_m.supplier_user_id <> auth.uid() then
    raise exception 'invite already used' using errcode = '42501';
  end if;
  update condo_maintainers set supplier_user_id = auth.uid() where id = v_m.id;
  return v_m.building_id;
end $$;

-- un residente aggiunge alla rubrica un Recofixer già iscritto
create or replace function public.add_supplier_to_condo(p_building uuid, p_supplier uuid, p_category text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_s suppliers%rowtype; v_id uuid;
begin
  if not public.is_member(p_building) then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into v_s from suppliers where id = p_supplier;
  if not found then raise exception 'supplier not found' using errcode = 'P0002'; end if;
  select id into v_id from condo_maintainers where building_id = p_building and supplier_user_id = p_supplier
    and (p_category is null or category = p_category) limit 1;
  if v_id is not null then return v_id; end if;
  insert into condo_maintainers (building_id, created_by, name, company, category, phone, email, supplier_user_id)
  values (p_building, auth.uid(), v_s.company_name, v_s.company_name,
          coalesce(p_category, v_s.categories[1], 'other'), v_s.phone, v_s.email, p_supplier)
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.search_suppliers(p_category text, p_city text)
returns table (id uuid, company_name text, categories text[], zones text[], verified boolean, jobs int)
language sql stable security definer set search_path = public as $$
  select s.id, s.company_name, s.categories, s.zones, s.verified,
         (select count(*)::int from condo_interventions i join condo_maintainers m on m.id = i.maintainer_id
           where m.supplier_user_id = s.id and i.status = 'done')
    from suppliers s
   where (p_category is null or p_category = any(s.categories))
     and (p_city is null or exists (select 1 from unnest(s.zones) z where lower(z) = lower(p_city)) or cardinality(s.zones) = 0)
   order by s.verified desc, s.company_name
   limit 30
$$;

-- 7. Area fornitore: i miei interventi
create or replace function public.supplier_interventions()
returns table (
  id uuid, ref_number int, building_id uuid, building_address text, title text, category text, description text,
  location text, status text, scheduled_date date, time_start time, time_end time,
  proposed_date date, proposed_time_start time, proposed_time_end time,
  completion_notes text, completed_at timestamptz, requester text, thread_id uuid, created_at timestamptz
) language sql stable security definer set search_path = public as $$
  select i.id, i.ref_number, i.building_id,
         b.address || coalesce(', ' || b.street_number, '') || coalesce(' · ' || b.city, ''),
         i.title, i.category, i.description, i.location, i.status, i.scheduled_date, i.time_start, i.time_end,
         i.proposed_date, i.proposed_time_start, i.proposed_time_end, i.completion_notes, i.completed_at,
         p.display_name, t.id, i.created_at
    from condo_interventions i
    join condo_maintainers m on m.id = i.maintainer_id and m.supplier_user_id = auth.uid()
    join buildings b on b.id = i.building_id
    left join profiles p on p.id = i.created_by
    left join condo_threads t on t.intervention_id = i.id
   order by case i.status when 'requested' then 0 when 'scheduled' then 1 else 2 end, i.created_at desc
$$;

-- messaggio di sistema nella chat dell'intervento (scritto a nome di chi agisce)
create or replace function public.intervention_note(p_intervention uuid, p_text text)
returns void language plpgsql security definer set search_path = public as $$
declare v_thread uuid;
begin
  perform public.sync_intervention_supplier(p_intervention);
  select id into v_thread from condo_threads where intervention_id = p_intervention;
  if v_thread is not null then
    insert into condo_thread_messages (thread_id, created_by, content) values (v_thread, auth.uid(), p_text);
  end if;
end $$;
revoke all on function public.intervention_note(uuid, text) from public, anon, authenticated;

create or replace function public.supplier_propose_date(p_intervention uuid, p_date date, p_start time, p_end time)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_intervention_supplier(p_intervention) then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_date < current_date then raise exception 'date in the past' using errcode = '22023'; end if;
  update condo_interventions set proposed_date = p_date, proposed_time_start = p_start, proposed_time_end = p_end, updated_at = now()
   where id = p_intervention and status in ('requested', 'scheduled');
  perform public.intervention_note(p_intervention,
    'Proposta di data: ' || to_char(p_date, 'DD/MM/YYYY') || coalesce(' alle ' || to_char(p_start, 'HH24:MI'), '') || '. Confermala dalla scheda dell''intervento.');
end $$;

-- il residente conferma la data proposta: l'intervento va in calendario
create or replace function public.confirm_proposed_date(p_intervention uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v condo_interventions%rowtype;
begin
  select * into v from condo_interventions where id = p_intervention;
  if not found or v.created_by <> auth.uid() then raise exception 'forbidden' using errcode = '42501'; end if;
  if v.proposed_date is null then raise exception 'no proposal' using errcode = '22023'; end if;
  update condo_interventions
     set status = 'scheduled', scheduled_date = v.proposed_date, time_start = v.proposed_time_start, time_end = v.proposed_time_end,
         proposed_date = null, proposed_time_start = null, proposed_time_end = null, updated_at = now()
   where id = p_intervention;
  perform public.intervention_note(p_intervention, 'Data confermata: ' || to_char(v.proposed_date, 'DD/MM/YYYY') || coalesce(' alle ' || to_char(v.proposed_time_start, 'HH24:MI'), '') || '.');
end $$;

create or replace function public.supplier_complete(p_intervention uuid, p_notes text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_intervention_supplier(p_intervention) then raise exception 'forbidden' using errcode = '42501'; end if;
  update condo_interventions
     set status = 'done', completion_notes = nullif(trim(p_notes), ''), completed_at = now(), completed_by = auth.uid(),
         scheduled_date = coalesce(scheduled_date, current_date), updated_at = now()
   where id = p_intervention and status in ('requested', 'scheduled');
  perform public.intervention_note(p_intervention, 'Intervento completato.' || coalesce(' Note: ' || nullif(trim(p_notes), ''), ''));
end $$;

-- 8. Preventivi, fatture e foto dell'intervento
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('intervention-files', 'intervention-files', false, 20971520,
  array['application/pdf','image/jpeg','image/png','image/webp','image/heic'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.condo_intervention_files (
  id uuid primary key default gen_random_uuid(),
  intervention_id uuid not null references public.condo_interventions(id) on delete cascade,
  kind text not null check (kind in ('quote', 'invoice', 'photo')),
  amount_cents bigint check (amount_cents is null or amount_cents >= 0),
  file_path text not null unique,
  file_name text not null,
  mime_type text,
  uploaded_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.condo_intervention_files enable row level security;

create or replace function public.can_see_intervention(p_intervention uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from condo_interventions i where i.id = p_intervention
                   and ((i.created_by = auth.uid() and public.is_member(i.building_id)) or public.is_condo_admin(i.building_id)))
      or public.is_intervention_supplier(p_intervention)
$$;

drop policy if exists "intervention files: read" on public.condo_intervention_files;
create policy "intervention files: read" on public.condo_intervention_files for select to authenticated
  using (public.can_see_intervention(intervention_id));
drop policy if exists "intervention files: insert" on public.condo_intervention_files;
create policy "intervention files: insert" on public.condo_intervention_files for insert to authenticated
  with check (uploaded_by = auth.uid() and public.can_see_intervention(intervention_id)
              and split_part(file_path, '/', 1) = intervention_id::text);
drop policy if exists "intervention files: delete own" on public.condo_intervention_files;
create policy "intervention files: delete own" on public.condo_intervention_files for delete to authenticated
  using (uploaded_by = auth.uid());
revoke all on public.condo_intervention_files from anon;
revoke update on public.condo_intervention_files from authenticated;
grant select, insert, delete on public.condo_intervention_files to authenticated;

drop policy if exists "intervention_files: upload" on storage.objects;
create policy "intervention_files: upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'intervention-files' and public.can_see_intervention(((storage.foldername(name))[1])::uuid));
drop policy if exists "intervention_files: read" on storage.objects;
create policy "intervention_files: read" on storage.objects for select to authenticated
  using (bucket_id = 'intervention-files' and public.can_see_intervention(((storage.foldername(name))[1])::uuid));
drop policy if exists "intervention_files: delete" on storage.objects;
create policy "intervention_files: delete" on storage.objects for delete to authenticated
  using (bucket_id = 'intervention-files' and owner = auth.uid());

-- 9. Permessi funzioni
do $$ declare f text; begin
  foreach f in array array[
    'is_intervention_supplier(uuid)', 'create_supplier_invite(uuid)', 'claim_supplier_invite(uuid)',
    'add_supplier_to_condo(uuid, uuid, text)', 'search_suppliers(text, text)', 'supplier_interventions()',
    'supplier_propose_date(uuid, date, time, time)', 'confirm_proposed_date(uuid)', 'supplier_complete(uuid, text)',
    'can_see_intervention(uuid)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
revoke all on function public.supplier_invite_info(uuid) from public;
grant execute on function public.supplier_invite_info(uuid) to anon, authenticated;

-- la voce in rubrica può non avere telefono/email se è collegata a un account
alter table public.condo_maintainers drop constraint if exists condo_maintainers_check;
alter table public.condo_maintainers add constraint condo_maintainers_check
  check (phone is not null or email is not null or supplier_user_id is not null);

-- Chi crea il profilo fornitore diventa Recofixer, ma solo se l'account non
-- è già usato come residente (condomini o recensioni) o amministratore.
create or replace function public.become_supplier_role()
returns text language plpgsql security definer set search_path = public as $$
declare v_role text;
begin
  if not exists (select 1 from suppliers where id = auth.uid()) then
    raise exception 'no supplier profile' using errcode = '42501';
  end if;
  select role into v_role from profiles where id = auth.uid();
  if v_role is null or (v_role = 'condoranker'
      and not exists (select 1 from condo_members where user_id = auth.uid())
      and not exists (select 1 from reviews where user_id = auth.uid())) then
    update profiles set role = 'condofixer' where id = auth.uid();
    return 'condofixer';
  end if;
  return v_role;
end $$;
revoke all on function public.become_supplier_role() from public, anon;
grant execute on function public.become_supplier_role() to authenticated;
