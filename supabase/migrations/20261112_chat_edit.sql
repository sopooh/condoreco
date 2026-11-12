-- Modifica dei propri messaggi di testo in chat (gruppo e conversazioni).
alter table public.messages add column if not exists edited_at timestamptz;
alter table public.condo_thread_messages add column if not exists edited_at timestamptz;

create or replace function public.edit_chat_message(p_id uuid, p_content text, p_thread boolean default false)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare v text := left(trim(coalesce(p_content, '')), 2000); n int;
begin
  if v = '' then raise exception 'Messaggio vuoto' using errcode = '22023'; end if;
  if p_thread then
    update condo_thread_messages set content = v, edited_at = now()
     where id = p_id and created_by = auth.uid() and coalesce(kind, 'text') = 'text';
  else
    update messages set content = v, edited_at = now()
     where id = p_id and created_by = auth.uid() and coalesce(kind, 'text') = 'text' and not hidden;
  end if;
  get diagnostics n = row_count;
  if n = 0 then raise exception 'Puoi modificare solo i tuoi messaggi di testo' using errcode = '42501'; end if;
  return now();
end $$;
revoke all on function public.edit_chat_message(uuid, text, boolean) from public, anon;
grant execute on function public.edit_chat_message(uuid, text, boolean) to authenticated;
