-- Chat a più conversazioni nel condominio.
-- La chat di gruppo resta su public.messages. Qui: conversazione con
-- l'amministratore (una per residente, sempre aperta), chat private tra
-- residenti e chat di un intervento (chi lo ha chiesto + residenti aggiunti).

create table if not exists public.condo_threads (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id) on delete cascade,
  kind text not null check (kind in ('admin', 'direct', 'intervention')),
  -- admin: il residente a cui appartiene la conversazione con l'amministratore
  owner_id uuid references auth.users(id) on delete cascade,
  -- direct: chiave ordinata "uuid1:uuid2" per non duplicare le chat private
  direct_key text,
  intervention_id uuid unique references public.condo_interventions(id) on delete cascade,
  title text,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz,
  last_message_preview text,
  last_message_by uuid,
  unique (building_id, kind, owner_id),
  unique (building_id, direct_key)
);
create index if not exists condo_threads_building_idx on public.condo_threads (building_id, last_message_at desc nulls last);

create table if not exists public.condo_thread_members (
  thread_id uuid not null references public.condo_threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  added_by uuid,
  last_read_at timestamptz not null default now(),
  joined_at timestamptz not null default now(),
  primary key (thread_id, user_id)
);
create index if not exists condo_thread_members_user_idx on public.condo_thread_members (user_id);

create table if not exists public.condo_thread_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.condo_threads(id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists condo_thread_messages_thread_idx on public.condo_thread_messages (thread_id, created_at);

-- lettura della chat di gruppo (public.messages) per i non letti
create table if not exists public.condo_group_reads (
  building_id uuid not null references public.buildings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (building_id, user_id)
);

alter table public.condo_threads enable row level security;
alter table public.condo_thread_members enable row level security;
alter table public.condo_thread_messages enable row level security;
alter table public.condo_group_reads enable row level security;

create or replace function public.is_thread_member(p_thread uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from condo_thread_members tm join condo_threads t on t.id = tm.thread_id
     where tm.thread_id = p_thread and tm.user_id = auth.uid() and public.is_member(t.building_id))
$$;
revoke all on function public.is_thread_member(uuid) from public, anon;
grant execute on function public.is_thread_member(uuid) to authenticated;

drop policy if exists "threads: members read" on public.condo_threads;
create policy "threads: members read" on public.condo_threads for select to authenticated
  using (public.is_thread_member(id));
drop policy if exists "thread members: members read" on public.condo_thread_members;
create policy "thread members: members read" on public.condo_thread_members for select to authenticated
  using (public.is_thread_member(thread_id));
drop policy if exists "thread messages: members read" on public.condo_thread_messages;
create policy "thread messages: members read" on public.condo_thread_messages for select to authenticated
  using (public.is_thread_member(thread_id));
drop policy if exists "thread messages: members write" on public.condo_thread_messages;
create policy "thread messages: members write" on public.condo_thread_messages for insert to authenticated
  with check (created_by = auth.uid() and public.is_thread_member(thread_id));
drop policy if exists "group reads: own" on public.condo_group_reads;
create policy "group reads: own" on public.condo_group_reads for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.is_member(building_id));

revoke all on public.condo_threads, public.condo_thread_members, public.condo_thread_messages, public.condo_group_reads from anon;
revoke insert, update, delete on public.condo_threads, public.condo_thread_members from authenticated;
revoke update, delete on public.condo_thread_messages from authenticated;
grant select on public.condo_threads, public.condo_thread_members to authenticated;
grant select, insert on public.condo_thread_messages to authenticated;
grant select, insert, update on public.condo_group_reads to authenticated;

-- ultimo messaggio sulla conversazione (per l'elenco)
create or replace function public.condo_thread_touch()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update condo_threads
     set last_message_at = new.created_at, last_message_preview = left(new.content, 140), last_message_by = new.created_by
   where id = new.thread_id;
  update condo_thread_members set last_read_at = new.created_at
   where thread_id = new.thread_id and user_id = new.created_by;
  return new;
end $$;
drop trigger if exists condo_thread_touch on public.condo_thread_messages;
create trigger condo_thread_touch after insert on public.condo_thread_messages
  for each row execute function public.condo_thread_touch();
revoke all on function public.condo_thread_touch() from public, anon, authenticated;

-- Conversazione con l'amministratore: una per residente; ne fanno parte il
-- residente e tutti gli admin del condominio (aggiunti anche se arrivano dopo).
create or replace function public.open_admin_thread(p_building uuid, p_resident uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_owner uuid := coalesce(p_resident, auth.uid());
  v_id uuid;
begin
  if not public.is_member(p_building) then raise exception 'not a member' using errcode = '42501'; end if;
  -- solo un admin può aprire la conversazione di un altro residente
  if v_owner <> auth.uid() and not public.is_condo_admin(p_building) then raise exception 'forbidden' using errcode = '42501'; end if;
  if not exists (select 1 from condo_members where building_id = p_building and user_id = v_owner) then
    raise exception 'resident not found' using errcode = 'P0002';
  end if;
  select id into v_id from condo_threads where building_id = p_building and kind = 'admin' and owner_id = v_owner;
  if v_id is null then
    insert into condo_threads (building_id, kind, owner_id, created_by) values (p_building, 'admin', v_owner, auth.uid())
    returning id into v_id;
  end if;
  insert into condo_thread_members (thread_id, user_id, added_by)
  select v_id, u, auth.uid() from (
    select v_owner as u
    union select user_id from condo_members where building_id = p_building and role = 'admin'
  ) x
  on conflict do nothing;
  return v_id;
end $$;

-- Chat privata tra due residenti dello stesso condominio
create or replace function public.open_direct_thread(p_building uuid, p_other uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_key text;
  v_id uuid;
begin
  if not public.is_member(p_building) or p_other = auth.uid() then raise exception 'forbidden' using errcode = '42501'; end if;
  if not exists (select 1 from condo_members where building_id = p_building and user_id = p_other) then
    raise exception 'resident not found' using errcode = 'P0002';
  end if;
  v_key := least(auth.uid()::text, p_other::text) || ':' || greatest(auth.uid()::text, p_other::text);
  select id into v_id from condo_threads where building_id = p_building and direct_key = v_key;
  if v_id is null then
    insert into condo_threads (building_id, kind, direct_key, created_by) values (p_building, 'direct', v_key, auth.uid())
    returning id into v_id;
    insert into condo_thread_members (thread_id, user_id, added_by) values (v_id, auth.uid(), auth.uid()), (v_id, p_other, auth.uid());
  end if;
  return v_id;
end $$;

-- Chat di un intervento: la apre chi ha chiesto l'intervento
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
  return v_id;
end $$;

-- Aggiungere residenti a una chat di intervento (lo può fare chi ne fa parte)
create or replace function public.add_thread_members(p_thread uuid, p_users uuid[])
returns int language plpgsql security definer set search_path = public as $$
declare
  v_t condo_threads%rowtype;
  v_n int;
begin
  select * into v_t from condo_threads where id = p_thread;
  if not found or not public.is_thread_member(p_thread) then raise exception 'forbidden' using errcode = '42501'; end if;
  if v_t.kind <> 'intervention' then raise exception 'only intervention chats accept new members' using errcode = '22023'; end if;
  insert into condo_thread_members (thread_id, user_id, added_by)
  select p_thread, m.user_id, auth.uid() from condo_members m
   where m.building_id = v_t.building_id and m.user_id = any(p_users)
  on conflict do nothing;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

create or replace function public.mark_thread_read(p_thread uuid)
returns void language sql security definer set search_path = public as $$
  update condo_thread_members set last_read_at = now() where thread_id = p_thread and user_id = auth.uid()
$$;

-- Elenco conversazioni dell'utente nel condominio, con titolo calcolato per
-- chi guarda, ultimo messaggio e non letti. Include la chat di gruppo.
create or replace function public.my_condo_threads(p_building uuid)
returns table (
  thread_id uuid, kind text, title text, subtitle text, other_user uuid, intervention_id uuid, intervention_status text,
  last_message_at timestamptz, last_message_preview text, last_message_author text, unread int, members int
) language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_member(p_building) then return; end if;

  return query
  -- chat di gruppo
  select null::uuid, 'group'::text, 'Chat del condominio'::text, null::text, null::uuid, null::uuid, null::text,
         lm.created_at, left(lm.content, 140), lp.display_name::text,
         (select count(*)::int from messages m2 where m2.building_id = p_building and not m2.hidden
            and m2.created_by <> auth.uid()
            and m2.created_at > coalesce((select r.last_read_at from condo_group_reads r where r.building_id = p_building and r.user_id = auth.uid()), '-infinity')),
         (select count(*)::int from condo_members cm where cm.building_id = p_building)
    from (select null) x
    left join lateral (select * from messages m where m.building_id = p_building and not m.hidden order by m.created_at desc limit 1) lm on true
    left join profiles lp on lp.id = lm.created_by
  union all
  select t.id, t.kind,
         case t.kind
           when 'admin' then case when t.owner_id = auth.uid() then 'Amministratore' else coalesce(op.display_name, 'Residente') end
           when 'direct' then coalesce(dp.display_name, 'Residente')
           else 'Intervento: ' || coalesce(t.title, '') end,
         case when t.kind = 'admin' and t.owner_id <> auth.uid() then 'Conversazione con l''amministratore' end,
         case t.kind when 'direct' then du.user_id when 'admin' then case when t.owner_id <> auth.uid() then t.owner_id end end,
         t.intervention_id, ci.status,
         t.last_message_at, t.last_message_preview, ap.display_name::text,
         (select count(*)::int from condo_thread_messages tm2 where tm2.thread_id = t.id and tm2.created_by <> auth.uid() and tm2.created_at > me.last_read_at),
         (select count(*)::int from condo_thread_members x2 where x2.thread_id = t.id)
    from condo_threads t
    join condo_thread_members me on me.thread_id = t.id and me.user_id = auth.uid()
    left join profiles op on op.id = t.owner_id
    left join lateral (select x.user_id from condo_thread_members x where x.thread_id = t.id and x.user_id <> auth.uid() limit 1) du on t.kind = 'direct'
    left join profiles dp on dp.id = du.user_id
    left join profiles ap on ap.id = t.last_message_by
    left join condo_interventions ci on ci.id = t.intervention_id
   where t.building_id = p_building;
end $$;

-- Rubrica dei residenti del condominio (per il "+")
create or replace function public.condo_directory(p_building uuid)
returns table (user_id uuid, display_name text, avatar_url text, floor text, role text)
language sql stable security definer set search_path = public as $$
  select m.user_id, p.display_name::text, p.avatar_url::text, m.floor, m.role
    from condo_members m left join profiles p on p.id = m.user_id
   where m.building_id = p_building and public.is_member(p_building) and m.user_id <> auth.uid()
   order by p.display_name
$$;

do $$ declare f text; begin
  foreach f in array array[
    'open_admin_thread(uuid, uuid)', 'open_direct_thread(uuid, uuid)', 'open_intervention_thread(uuid)',
    'add_thread_members(uuid, uuid[])', 'mark_thread_read(uuid)', 'my_condo_threads(uuid)', 'condo_directory(uuid)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

-- realtime per i nuovi messaggi delle conversazioni
do $$ begin
  alter publication supabase_realtime add table public.condo_thread_messages;
exception when duplicate_object then null; end $$;
