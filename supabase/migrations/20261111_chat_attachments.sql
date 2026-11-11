-- Allegati e messaggi speciali nelle chat (gruppo = messages, conversazioni = condo_thread_messages).
-- kind: text | file | image | video | audio | contact | poll | event
-- attachment: { path, name, size, mime } su bucket privato chat-files
-- ref_id: id del sondaggio o dell'evento; meta: dati del contatto
-- content resta obbligatorio: per gli allegati è la didascalia o un'etichetta
-- ("Documento: verbale.pdf"), usata anche come anteprima nell'elenco chat.


alter table public.messages
  add column if not exists kind text not null default 'text',
  add column if not exists attachment jsonb,
  add column if not exists ref_id uuid,
  add column if not exists meta jsonb;
alter table public.condo_thread_messages
  add column if not exists kind text not null default 'text',
  add column if not exists attachment jsonb,
  add column if not exists ref_id uuid,
  add column if not exists meta jsonb;

alter table public.messages drop constraint if exists messages_kind_check;
alter table public.messages add constraint messages_kind_check
  check (kind in ('text','file','image','video','audio','contact','poll','event'));
alter table public.condo_thread_messages drop constraint if exists condo_thread_messages_kind_check;
alter table public.condo_thread_messages add constraint condo_thread_messages_kind_check
  check (kind in ('text','file','image','video','audio','contact'));

-- Bucket privato, 25 MB per file
insert into storage.buckets (id, name, public, file_size_limit)
values ('chat-files', 'chat-files', false, 26214400)
on conflict (id) do update set public = false, file_size_limit = 26214400;

-- Percorsi: <building>/g/<file>  (chat del condominio)
--           <building>/t/<thread>/<file>  (conversazione)
create or replace function public.can_access_chat_file(p_name text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  parts text[] := string_to_array(p_name, '/');
  uuid_re constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
begin
  if array_length(parts, 1) < 3 or parts[1] !~ uuid_re then return false; end if;
  if parts[2] = 'g' then
    return is_member(parts[1]::uuid);
  elsif parts[2] = 't' and array_length(parts, 1) >= 4 and parts[3] ~ uuid_re then
    return is_thread_member(parts[3]::uuid)
       and exists (select 1 from condo_threads t where t.id = parts[3]::uuid and t.building_id = parts[1]::uuid);
  end if;
  return false;
end $$;
revoke all on function public.can_access_chat_file(text) from public, anon;
grant execute on function public.can_access_chat_file(text) to authenticated;

drop policy if exists "chat files: read" on storage.objects;
create policy "chat files: read" on storage.objects for select to authenticated
  using (bucket_id = 'chat-files' and public.can_access_chat_file(name));
drop policy if exists "chat files: upload" on storage.objects;
create policy "chat files: upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'chat-files' and public.can_access_chat_file(name));
drop policy if exists "chat files: delete own" on storage.objects;
create policy "chat files: delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'chat-files' and owner = auth.uid());

-- Allegato coerente con la chat: il percorso deve stare nella stessa chat del messaggio
create or replace function public.chat_attachment_guard()
returns trigger language plpgsql set search_path = public as $$
declare p text := new.attachment->>'path';
begin
  if new.kind in ('file','image','video','audio') then
    if p is null then raise exception 'allegato mancante'; end if;
    if tg_table_name = 'messages' and p not like new.building_id::text || '/g/%' then
      raise exception 'allegato non valido';
    end if;
    if tg_table_name = 'condo_thread_messages' and p not like '%/t/' || new.thread_id::text || '/%' then
      raise exception 'allegato non valido';
    end if;
  end if;
  if new.kind = 'event' and tg_table_name = 'messages'
     and not exists (select 1 from events e where e.id = new.ref_id and e.building_id = new.building_id) then
    raise exception 'evento non valido';
  end if;
  -- i sondaggi li scrive solo il trigger di sistema
  if tg_table_name = 'messages' and new.kind in ('poll') and current_setting('condoreco.system_post', true) is distinct from 'on' then
    raise exception 'i sondaggi arrivano in chat in automatico';
  end if;
  return new;
end $$;
drop trigger if exists messages_attachment_guard on public.messages;
create trigger messages_attachment_guard before insert on public.messages
  for each row execute function public.chat_attachment_guard();
drop trigger if exists thread_messages_attachment_guard on public.condo_thread_messages;
create trigger thread_messages_attachment_guard before insert on public.condo_thread_messages
  for each row execute function public.chat_attachment_guard();

-- Ogni sondaggio aperto finisce in automatico nella chat del condominio (una volta sola)
create or replace function public.post_poll_to_chat()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'open' and (tg_op = 'INSERT' or old.status is distinct from 'open')
     and not exists (select 1 from messages m where m.kind = 'poll' and m.ref_id = new.id) then
    perform set_config('condoreco.system_post', 'on', true);
    insert into messages (building_id, created_by, content, kind, ref_id)
    values (new.building_id, new.created_by, left('Sondaggio: ' || new.question, 2000), 'poll', new.id);
    perform set_config('condoreco.system_post', 'off', true);
  end if;
  return new;
end $$;
revoke all on function public.post_poll_to_chat() from public, anon, authenticated;
drop trigger if exists polls_post_to_chat on public.polls;
create trigger polls_post_to_chat after insert or update of status on public.polls
  for each row execute function public.post_poll_to_chat();

-- Se il sondaggio viene eliminato, il messaggio in chat sparisce
create or replace function public.unpost_poll_from_chat()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from messages where kind = 'poll' and ref_id = old.id;
  return old;
end $$;
revoke all on function public.unpost_poll_from_chat() from public, anon, authenticated;
drop trigger if exists polls_unpost_from_chat on public.polls;
create trigger polls_unpost_from_chat after delete on public.polls
  for each row execute function public.unpost_poll_from_chat();

-- I sondaggi già aperti prima di oggi entrano in chat con la loro data
select set_config('condoreco.system_post', 'on', true);
insert into public.messages (building_id, created_by, content, kind, ref_id, created_at)
select p.building_id, p.created_by, left('Sondaggio: ' || p.question, 2000), 'poll', p.id, p.created_at
  from public.polls p
 where p.status = 'open' and p.closes_at > now()
   and not exists (select 1 from public.messages m where m.kind = 'poll' and m.ref_id = p.id);
