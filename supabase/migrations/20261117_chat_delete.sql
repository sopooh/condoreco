-- Elimina per tutti (come WhatsApp): solo i propri messaggi, entro 2 minuti
-- dall'invio. Il messaggio resta come "Messaggio eliminato"; l'allegato viene
-- staccato e il client cancella il file dal bucket.
alter table public.messages add column if not exists deleted_at timestamptz;
alter table public.condo_thread_messages add column if not exists deleted_at timestamptz;

create or replace function public.delete_chat_message(p_id uuid, p_thread boolean default false)
returns text language plpgsql security definer set search_path = public as $$
declare v_path text; n int;
begin
  if p_thread then
    select attachment->>'path' into v_path from condo_thread_messages
     where id = p_id and created_by = auth.uid() and deleted_at is null
       and created_at > now() - interval '2 minutes';
    update condo_thread_messages
       set content = 'Messaggio eliminato', kind = 'text', attachment = null, ref_id = null, meta = null,
           edited_at = null, deleted_at = now()
     where id = p_id and created_by = auth.uid() and deleted_at is null
       and created_at > now() - interval '2 minutes';
  else
    select attachment->>'path' into v_path from messages
     where id = p_id and created_by = auth.uid() and deleted_at is null and coalesce(kind, 'text') <> 'poll'
       and created_at > now() - interval '2 minutes';
    update messages
       set content = 'Messaggio eliminato', kind = 'text', attachment = null, ref_id = null, meta = null,
           edited_at = null, deleted_at = now()
     where id = p_id and created_by = auth.uid() and deleted_at is null and coalesce(kind, 'text') <> 'poll'
       and created_at > now() - interval '2 minutes';
  end if;
  get diagnostics n = row_count;
  if n = 0 then raise exception 'Puoi eliminare solo i tuoi messaggi nei primi 2 minuti' using errcode = '42501'; end if;
  return v_path;
end $$;
revoke all on function public.delete_chat_message(uuid, boolean) from public, anon;
grant execute on function public.delete_chat_message(uuid, boolean) to authenticated;

-- Un messaggio eliminato non si puo' piu' modificare
create or replace function public.edit_chat_message(p_id uuid, p_content text, p_thread boolean default false)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare v text := left(trim(coalesce(p_content, '')), 2000); n int;
begin
  if v = '' then raise exception 'Messaggio vuoto' using errcode = '22023'; end if;
  if p_thread then
    update condo_thread_messages set content = v, edited_at = now()
     where id = p_id and created_by = auth.uid() and coalesce(kind, 'text') = 'text' and deleted_at is null;
  else
    update messages set content = v, edited_at = now()
     where id = p_id and created_by = auth.uid() and coalesce(kind, 'text') = 'text' and not hidden and deleted_at is null;
  end if;
  get diagnostics n = row_count;
  if n = 0 then raise exception 'Puoi modificare solo i tuoi messaggi di testo' using errcode = '42501'; end if;
  return now();
end $$;
