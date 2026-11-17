-- Due gruppi per ogni condominio:
--   * "Condominio" (channel = 'all'): residenti verificati + amministratore
--   * "Tra vicini" (channel = 'residents'): solo i condomini, l'amministratore non
--     lo vede (ne' messaggi, ne' allegati, ne' notifiche in tempo reale)
-- Gli allegati del gruppo Tra vicini stanno in <building>/v/... invece di /g/.

-- chi e' condomino (membro non amministratore)
create or replace function public.is_resident(p_building uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from condo_members where building_id = p_building and user_id = auth.uid() and role <> 'admin')
$$;

alter table public.messages add column if not exists channel text not null default 'all';
alter table public.messages drop constraint if exists messages_channel_check;
alter table public.messages add constraint messages_channel_check check (channel in ('all', 'residents'));
create index if not exists messages_building_channel_idx on public.messages (building_id, channel, created_at desc);

drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages for select using (
  is_member(building_id)
  and (channel = 'all' or is_resident(building_id))
  and (hidden = false or (channel = 'all' and is_condo_admin(building_id)))
);
drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert with check (
  is_member(building_id) and created_by = auth.uid() and (channel = 'all' or is_resident(building_id))
);
-- l'amministratore modera solo il gruppo dove c'e' anche lui
drop policy if exists messages_moderate on public.messages;
create policy messages_moderate on public.messages for update using (channel = 'all' and is_condo_admin(building_id));

-- allegati: cartella in base al gruppo
create or replace function public.chat_attachment_guard()
returns trigger language plpgsql set search_path to 'public'
as $function$
declare
  r jsonb := to_jsonb(new);
  p text := r->'attachment'->>'path';
  folder text := '/g/%';
begin
  if r->>'channel' = 'residents' then folder := '/v/%'; end if;
  if r->>'kind' in ('file','image','video','audio') then
    if p is null then raise exception 'allegato mancante'; end if;
    if tg_table_name = 'messages' then
      if p not like (r->>'building_id') || folder then raise exception 'allegato non valido'; end if;
    elsif tg_table_name = 'condo_thread_messages' then
      if p not like '%/t/' || (r->>'thread_id') || '/%' then raise exception 'allegato non valido'; end if;
    end if;
  end if;
  if tg_table_name = 'messages' and r->>'kind' = 'event'
     and not exists (select 1 from events e where e.id = (r->>'ref_id')::uuid and e.building_id = (r->>'building_id')::uuid) then
    raise exception 'evento non valido';
  end if;
  if tg_table_name = 'messages' and r->>'kind' = 'poll' and current_setting('condoreco.system_post', true) is distinct from 'on' then
    raise exception 'i sondaggi arrivano in chat in automatico';
  end if;
  return new;
end $function$;

create or replace function public.can_access_chat_file(p_name text)
returns boolean language plpgsql stable security definer set search_path = public as $function$
declare
  parts text[] := string_to_array(p_name, '/');
  uuid_re constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
begin
  if array_length(parts, 1) < 3 or parts[1] !~ uuid_re then return false; end if;
  if parts[2] = 'g' then
    return is_member(parts[1]::uuid);
  elsif parts[2] = 'v' then
    return is_resident(parts[1]::uuid);
  elsif parts[2] = 't' and array_length(parts, 1) >= 4 and parts[3] ~ uuid_re then
    return is_thread_member(parts[3]::uuid)
       and exists (select 1 from condo_threads t where t.id = parts[3]::uuid and t.building_id = parts[1]::uuid);
  end if;
  return false;
end $function$;

-- letture: una per gruppo
alter table public.condo_group_reads add column if not exists channel text not null default 'all';
alter table public.condo_group_reads drop constraint if exists condo_group_reads_pkey;
alter table public.condo_group_reads add primary key (building_id, user_id, channel);

-- riassunti di Condor: uno per gruppo
alter table public.chat_summaries add column if not exists channel text not null default 'all';
alter table public.chat_summaries drop constraint if exists chat_summaries_pkey;
alter table public.chat_summaries add primary key (building_id, channel);

-- elenco chat: i due gruppi in cima (Vicini solo per i condomini)
create or replace function public.my_condo_threads(p_building uuid)
returns table(thread_id uuid, kind text, title text, subtitle text, other_user uuid, intervention_id uuid, intervention_status text,
              last_message_at timestamptz, last_message_preview text, last_message_author text, unread integer, members integer)
language plpgsql stable security definer set search_path to 'public'
as $function$
begin
  if not public.is_member(p_building) then return; end if;

  return query
  select null::uuid, g.kind, g.title, g.subtitle, null::uuid, null::uuid, null::text,
         lm.created_at, left(lm.content, 140), lp.display_name::text,
         (select count(*)::int from messages m2 where m2.building_id = p_building and m2.channel = g.channel and not m2.hidden
            and m2.created_by <> auth.uid()
            and m2.created_at > coalesce((select r.last_read_at from condo_group_reads r where r.building_id = p_building and r.user_id = auth.uid() and r.channel = g.channel), '-infinity')),
         (select count(*)::int from condo_members cm where cm.building_id = p_building and (g.channel = 'all' or cm.role <> 'admin'))
    from (values ('all', 'group', 'Condominio', 'Residenti e amministratore'),
                 ('residents', 'group_residents', 'Tra vicini', 'Solo condòmini')) as g(channel, kind, title, subtitle)
    left join lateral (select * from messages m where m.building_id = p_building and m.channel = g.channel and not m.hidden order by m.created_at desc limit 1) lm on true
    left join profiles lp on lp.id = lm.created_by
   where g.channel = 'all' or public.is_resident(p_building)
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
end $function$;
