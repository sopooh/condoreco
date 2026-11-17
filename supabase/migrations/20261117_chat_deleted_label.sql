-- Testo dei messaggi eliminati per tutti: "Cancellato per tutti" (anche nelle anteprime)
update public.messages set content = 'Cancellato per tutti' where deleted_at is not null and content = 'Messaggio eliminato';
update public.condo_thread_messages set content = 'Cancellato per tutti' where deleted_at is not null and content = 'Messaggio eliminato';

create or replace function public.delete_chat_message(p_id uuid, p_thread boolean default false)
returns text language plpgsql security definer set search_path = public as $$
declare v_path text; n int;
begin
  if p_thread then
    select attachment->>'path' into v_path from condo_thread_messages
     where id = p_id and created_by = auth.uid() and deleted_at is null
       and created_at > now() - interval '2 minutes';
    update condo_thread_messages
       set content = 'Cancellato per tutti', kind = 'text', attachment = null, ref_id = null, meta = null,
           edited_at = null, deleted_at = now()
     where id = p_id and created_by = auth.uid() and deleted_at is null
       and created_at > now() - interval '2 minutes';
  else
    select attachment->>'path' into v_path from messages
     where id = p_id and created_by = auth.uid() and deleted_at is null and coalesce(kind, 'text') <> 'poll'
       and created_at > now() - interval '2 minutes';
    update messages
       set content = 'Cancellato per tutti', kind = 'text', attachment = null, ref_id = null, meta = null,
           edited_at = null, deleted_at = now()
     where id = p_id and created_by = auth.uid() and deleted_at is null and coalesce(kind, 'text') <> 'poll'
       and created_at > now() - interval '2 minutes';
  end if;
  get diagnostics n = row_count;
  if n = 0 then raise exception 'Puoi eliminare solo i tuoi messaggi nei primi 2 minuti' using errcode = '42501'; end if;
  return v_path;
end $$;
