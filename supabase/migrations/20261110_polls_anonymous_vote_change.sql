-- Decisioni: voto anonimo o palese (scelto da chi propone) e un solo cambio di voto.
-- Applicata su Supabase come polls_anonymous_and_vote_change + polls_anonymous_grant.
alter table public.polls add column if not exists is_anonymous boolean not null default false;
alter table public.poll_votes add column if not exists changed_count int not null default 0;
alter table public.poll_votes add column if not exists updated_at timestamptz;
grant update (is_anonymous) on public.polls to authenticated;

drop policy if exists votes_select on public.poll_votes;
create policy votes_select on public.poll_votes for select using (
  user_id = auth.uid()
  or exists (select 1 from public.polls p where p.id = poll_votes.poll_id and public.is_member(p.building_id) and not p.is_anonymous)
);

create or replace function public.poll_tallies(p_building uuid)
returns table (poll_id uuid, yes_votes int, total_votes int, others_voted boolean)
language sql stable security definer set search_path = public as $$
  select p.id,
         count(v.*) filter (where v.vote)::int,
         count(v.*)::int,
         coalesce(bool_or(v.user_id <> auth.uid()), false)
    from polls p left join poll_votes v on v.poll_id = p.id
   where p.building_id = p_building and public.is_member(p_building)
   group by p.id
$$;
revoke all on function public.poll_tallies(uuid) from public, anon;
grant execute on function public.poll_tallies(uuid) to authenticated;

create or replace function public.change_poll_vote(p_poll_id uuid, p_vote boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_poll polls%rowtype;
  v_row poll_votes%rowtype;
begin
  select * into v_poll from polls where id = p_poll_id;
  if not found or not public.is_member(v_poll.building_id) then
    raise exception 'Decisione non trovata' using errcode = 'P0002';
  end if;
  if v_poll.status <> 'open' or v_poll.closes_at <= now() then
    raise exception 'La votazione è chiusa' using errcode = '42501';
  end if;
  select * into v_row from poll_votes where poll_id = p_poll_id and user_id = auth.uid() for update;
  if not found then
    raise exception 'Non hai ancora votato' using errcode = 'P0002';
  end if;
  if v_row.changed_count >= 1 then
    raise exception 'Hai già cambiato il voto una volta' using errcode = '42501';
  end if;
  if v_row.vote = p_vote then
    return;
  end if;
  update poll_votes set vote = p_vote, changed_count = changed_count + 1, updated_at = now()
   where poll_id = p_poll_id and user_id = auth.uid();
end $$;
revoke all on function public.change_poll_vote(uuid, boolean) from public, anon;
grant execute on function public.change_poll_vote(uuid, boolean) to authenticated;

create or replace function public.polls_guard_author_edit()
returns trigger language plpgsql set search_path to 'public' as $function$
begin
  if auth.uid() is null then
    return new;
  end if;
  if (new.question is distinct from old.question or new.is_anonymous is distinct from old.is_anonymous) and exists (
    select 1 from public.poll_votes v where v.poll_id = old.id and v.user_id <> auth.uid()
  ) then
    raise exception 'Testo e anonimato non si possono modificare dopo che altri residenti hanno votato'
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
$function$;
