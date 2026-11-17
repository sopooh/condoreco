-- Fix: il trigger leggeva new.thread_id anche sulla tabella messages (che non ha
-- quella colonna) e ogni allegato in chat del condominio falliva. Ora legge i
-- campi tramite to_jsonb(new), valido per entrambe le tabelle.
create or replace function public.chat_attachment_guard()
returns trigger language plpgsql set search_path to 'public'
as $function$
declare
  r jsonb := to_jsonb(new);
  p text := r->'attachment'->>'path';
begin
  if r->>'kind' in ('file','image','video','audio') then
    if p is null then raise exception 'allegato mancante'; end if;
    if tg_table_name = 'messages' then
      if p not like (r->>'building_id') || '/g/%' then raise exception 'allegato non valido'; end if;
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
