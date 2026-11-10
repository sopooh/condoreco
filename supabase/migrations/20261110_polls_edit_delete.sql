-- Decisioni (polls): chi le ha create puo' modificarle finche' sono aperte
-- ed eliminarle; l'admin del condominio puo' eliminarle (moderazione).
--  - Modificabili solo question, min_votes, closes_at (stato ed esito
--    restano gestiti da close_expired_polls).
--  - Il testo (question) non si cambia se altri residenti hanno gia' votato.
--  - La nuova scadenza deve essere nel futuro.

drop policy if exists "polls: author update while open" on public.polls;
create policy "polls: author update while open"
  on public.polls
  for update
  to authenticated
  using (created_by = auth.uid() and status = 'open' and public.is_member(building_id))
  with check (created_by = auth.uid() and status = 'open' and public.is_member(building_id));

revoke update on public.polls from authenticated;
grant update (question, min_votes, closes_at) on public.polls to authenticated;

create or replace function public.polls_guard_author_edit()
returns trigger language plpgsql set search_path = public as $$
begin
  -- solo per modifiche fatte da utenti (pg_cron gira senza auth.uid())
  if auth.uid() is null then
    return new;
  end if;
  if new.question is distinct from old.question and exists (
    select 1 from public.poll_votes v where v.poll_id = old.id and v.user_id <> auth.uid()
  ) then
    raise exception 'Il testo non si puo'' modificare dopo che altri residenti hanno votato'
      using errcode = '42501';
  end if;
  if new.closes_at is distinct from old.closes_at and new.closes_at <= now() then
    raise exception 'La scadenza deve essere nel futuro' using errcode = '22023';
  end if;
  if new.min_votes is distinct from old.min_votes and new.min_votes < 1 then
    raise exception 'Il quorum deve essere almeno 1' using errcode = '22023';
  end if;
  return new;
end;
$$;

drop trigger if exists polls_guard_author_edit on public.polls;
create trigger polls_guard_author_edit
  before update on public.polls
  for each row execute function public.polls_guard_author_edit();

-- Eliminazione: funzione unica (voti + decisione) con controllo autore o
-- admin del condominio, cosi non dipende da ON DELETE CASCADE su poll_votes.
create or replace function public.delete_poll(p_poll_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_poll public.polls%rowtype;
begin
  select * into v_poll from public.polls where id = p_poll_id;
  if not found then
    raise exception 'Decisione non trovata' using errcode = 'P0002';
  end if;
  if not (
    (v_poll.created_by = auth.uid() and public.is_member(v_poll.building_id))
    or public.is_condo_admin(v_poll.building_id)
  ) then
    raise exception 'Non puoi eliminare questa decisione' using errcode = '42501';
  end if;
  delete from public.poll_votes where poll_id = p_poll_id;
  delete from public.polls where id = p_poll_id;
end;
$$;

revoke all on function public.delete_poll(uuid) from public, anon;
grant execute on function public.delete_poll(uuid) to authenticated;
