-- Fase 2 delle decisioni: dopo un Sì approvato (quorum + maggioranza),
-- si sceglie tra più proposte (es. colori della facciata), anche con immagini.
-- Il creatore (o l'admin del condominio) prepara le proposte già durante la fase 1
-- e può modificarle finché nessuno ha votato nella fase 2.
--
-- phase2_status: none (nessuna fase 2) | draft (proposte in preparazione)
--                | open (si vota) | closed (finita, vincitrice in phase2_winner)

alter table public.polls
  add column if not exists phase2_status text not null default 'none',
  add column if not exists phase2_question text,
  add column if not exists phase2_days int not null default 7,
  add column if not exists phase2_opens_at timestamptz,
  add column if not exists phase2_closes_at timestamptz,
  add column if not exists phase2_winner uuid;

alter table public.polls drop constraint if exists polls_phase2_status_check;
alter table public.polls add constraint polls_phase2_status_check check (phase2_status in ('none','draft','open','closed'));
alter table public.polls drop constraint if exists polls_phase2_days_check;
alter table public.polls add constraint polls_phase2_days_check check (phase2_days between 1 and 60);
alter table public.polls drop constraint if exists polls_phase2_question_check;
alter table public.polls add constraint polls_phase2_question_check check (phase2_question is null or char_length(phase2_question) between 3 and 200);

create table if not exists public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text check (description is null or char_length(description) <= 600),
  image_path text,
  position int not null default 0,
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists poll_options_poll_idx on public.poll_options(poll_id, position);

create table if not exists public.poll_option_votes (
  poll_id uuid not null references public.polls(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  option_id uuid not null references public.poll_options(id) on delete cascade,
  changed_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (poll_id, user_id)
);

alter table public.polls drop constraint if exists polls_phase2_winner_fkey;
alter table public.polls add constraint polls_phase2_winner_fkey foreign key (phase2_winner) references public.poll_options(id) on delete set null;

-- Chi può modificare le proposte: creatore della decisione o admin del condominio,
-- finché la fase 2 non è chiusa e nessuno ci ha ancora votato.
create or replace function public.can_edit_poll_options(p_poll uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from polls p
     where p.id = p_poll
       and ((p.created_by = auth.uid() and is_member(p.building_id)) or is_condo_admin(p.building_id))
       and p.status <> 'rejected'
       and p.phase2_status in ('none','draft','open')
       and not exists (select 1 from poll_option_votes v where v.poll_id = p.id)
  )
$$;
revoke all on function public.can_edit_poll_options(uuid) from public, anon;
grant execute on function public.can_edit_poll_options(uuid) to authenticated;

alter table public.poll_options enable row level security;
drop policy if exists "poll options: read" on public.poll_options;
create policy "poll options: read" on public.poll_options for select to authenticated
  using (exists (select 1 from polls p where p.id = poll_id and is_member(p.building_id)));
drop policy if exists "poll options: insert" on public.poll_options;
create policy "poll options: insert" on public.poll_options for insert to authenticated
  with check (created_by = auth.uid() and can_edit_poll_options(poll_id));
drop policy if exists "poll options: update" on public.poll_options;
create policy "poll options: update" on public.poll_options for update to authenticated
  using (can_edit_poll_options(poll_id)) with check (can_edit_poll_options(poll_id));
drop policy if exists "poll options: delete" on public.poll_options;
create policy "poll options: delete" on public.poll_options for delete to authenticated
  using (can_edit_poll_options(poll_id));
grant select, insert, update, delete on public.poll_options to authenticated;

alter table public.poll_option_votes enable row level security;
drop policy if exists "option votes: read" on public.poll_option_votes;
create policy "option votes: read" on public.poll_option_votes for select to authenticated
  using (user_id = auth.uid() or exists (select 1 from polls p where p.id = poll_id and is_member(p.building_id) and not p.is_anonymous));
drop policy if exists "option votes: vote" on public.poll_option_votes;
create policy "option votes: vote" on public.poll_option_votes for insert to authenticated
  with check (
    user_id = auth.uid() and changed_count = 0
    and exists (select 1 from polls p where p.id = poll_id and is_member(p.building_id)
                 and p.phase2_status = 'open' and p.phase2_closes_at > now())
    and exists (select 1 from poll_options o where o.id = option_id and o.poll_id = poll_option_votes.poll_id)
  );
grant select, insert on public.poll_option_votes to authenticated;

-- La policy di modifica attuale vale solo a decisione aperta: il creatore deve poter
-- preparare la fase 2 anche dopo l'approvazione (tramite questa funzione).
create or replace function public.set_poll_phase2(p_poll uuid, p_enabled boolean, p_question text, p_days int, p_closes_at timestamptz default null)
returns void language plpgsql security definer set search_path = public as $$
declare v polls%rowtype;
begin
  select * into v from polls where id = p_poll for update;
  if not found or not ((v.created_by = auth.uid() and is_member(v.building_id)) or is_condo_admin(v.building_id)) then
    raise exception 'Non puoi modificare questa decisione' using errcode = '42501';
  end if;
  if v.status = 'rejected' then raise exception 'La decisione è stata bocciata' using errcode = '42501'; end if;
  if v.phase2_status = 'closed' then raise exception 'La fase 2 è già conclusa' using errcode = '42501'; end if;
  if exists (select 1 from poll_option_votes o where o.poll_id = p_poll) then
    -- dopo il primo voto si può solo prolungare la scadenza
    if p_closes_at is not null and v.phase2_status = 'open' and p_closes_at > v.phase2_closes_at then
      update polls set phase2_closes_at = p_closes_at where id = p_poll;
      return;
    end if;
    raise exception 'Qualcuno ha già votato nella fase 2: puoi solo prolungarla' using errcode = '42501';
  end if;
  if v.phase2_status = 'open' then
    update polls set phase2_question = nullif(trim(p_question), ''), phase2_days = coalesce(p_days, phase2_days),
                     phase2_closes_at = coalesce(case when p_closes_at > now() then p_closes_at end, phase2_closes_at)
     where id = p_poll;
  else
    update polls set phase2_status = case when p_enabled then 'draft' else 'none' end,
                     phase2_question = nullif(trim(p_question), ''), phase2_days = coalesce(p_days, phase2_days)
     where id = p_poll;
    -- già approvata e con almeno 2 proposte: si apre subito
    if p_enabled and v.status = 'approved' then perform open_poll_phase2(p_poll); end if;
  end if;
end $$;
revoke all on function public.set_poll_phase2(uuid, boolean, text, int, timestamptz) from public, anon;
grant execute on function public.set_poll_phase2(uuid, boolean, text, int, timestamptz) to authenticated;

-- Apertura della fase 2 (uso interno e pulsante "Apri la fase 2")
create or replace function public.open_poll_phase2(p_poll uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v polls%rowtype; n int;
begin
  select * into v from polls where id = p_poll for update;
  if not found then return false; end if;
  if auth.uid() is not null and not ((v.created_by = auth.uid() and is_member(v.building_id)) or is_condo_admin(v.building_id)) then
    raise exception 'Non puoi aprire la fase 2' using errcode = '42501';
  end if;
  if v.status <> 'approved' or v.phase2_status <> 'draft' then return false; end if;
  select count(*) into n from poll_options where poll_id = p_poll;
  if n < 2 then return false; end if;
  perform set_config('condoreco.phase2_system', 'on', true);
  update polls set phase2_status = 'open', phase2_opens_at = now(), phase2_closes_at = now() + make_interval(days => phase2_days)
   where id = p_poll;
  perform set_config('condoreco.system_post', 'on', true);
  insert into messages (building_id, created_by, content, kind, ref_id, meta)
  values (v.building_id, v.created_by,
          left('Fase 2: ' || coalesce(v.phase2_question, 'scegli tra le proposte per "' || v.question || '"'), 2000),
          'poll', v.id, jsonb_build_object('phase', 2));
  perform set_config('condoreco.system_post', 'off', true);
  perform set_config('condoreco.phase2_system', 'off', true);
  return true;
end $$;
revoke all on function public.open_poll_phase2(uuid) from public, anon;
grant execute on function public.open_poll_phase2(uuid) to authenticated;

-- Il guard lascia passare le modifiche fatte dalle funzioni di sistema
create or replace function public.polls_phase2_guard()
returns trigger language plpgsql set search_path = public as $$
begin
  if auth.uid() is null or current_setting('condoreco.phase2_system', true) = 'on' then return new; end if;
  if new.phase2_status is distinct from old.phase2_status
     and not (old.phase2_status = 'none' and new.phase2_status = 'draft')
     and not (old.phase2_status = 'draft' and new.phase2_status = 'none') then
    raise exception 'La fase 2 si apre e si chiude in automatico' using errcode = '42501';
  end if;
  if (new.phase2_question is distinct from old.phase2_question or new.phase2_days is distinct from old.phase2_days)
     and exists (select 1 from poll_option_votes v where v.poll_id = old.id) then
    raise exception 'Qualcuno ha già votato nella fase 2' using errcode = '42501';
  end if;
  if new.phase2_opens_at is distinct from old.phase2_opens_at or new.phase2_winner is distinct from old.phase2_winner
     or (new.phase2_closes_at is distinct from old.phase2_closes_at and (new.phase2_closes_at <= now() or old.phase2_status <> 'open')) then
    raise exception 'Date della fase 2 non valide' using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists polls_phase2_guard on public.polls;
create trigger polls_phase2_guard before update on public.polls
  for each row execute function public.polls_phase2_guard();

-- Approvazione della fase 1 (dal job orario): apre la fase 2 se è pronta
create or replace function public.polls_on_approved()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' and new.phase2_status = 'draft' then
    perform open_poll_phase2(new.id);
  end if;
  return new;
end $$;
revoke all on function public.polls_on_approved() from public, anon, authenticated;
drop trigger if exists polls_on_approved on public.polls;
create trigger polls_on_approved after update of status on public.polls
  for each row execute function public.polls_on_approved();

-- Cambio del voto nella fase 2: una volta sola, come nella fase 1
create or replace function public.change_option_vote(p_poll uuid, p_option uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v polls%rowtype; r poll_option_votes%rowtype;
begin
  select * into v from polls where id = p_poll;
  if not found or not is_member(v.building_id) then raise exception 'Decisione non trovata' using errcode = 'P0002'; end if;
  if v.phase2_status <> 'open' or v.phase2_closes_at <= now() then raise exception 'La votazione è chiusa' using errcode = '42501'; end if;
  if not exists (select 1 from poll_options o where o.id = p_option and o.poll_id = p_poll) then raise exception 'Proposta non valida' using errcode = '22023'; end if;
  select * into r from poll_option_votes where poll_id = p_poll and user_id = auth.uid() for update;
  if not found then raise exception 'Non hai ancora votato' using errcode = 'P0002'; end if;
  if r.option_id = p_option then return; end if;
  if r.changed_count >= 1 then raise exception 'Hai già cambiato il voto una volta' using errcode = '42501'; end if;
  update poll_option_votes set option_id = p_option, changed_count = changed_count + 1, updated_at = now()
   where poll_id = p_poll and user_id = auth.uid();
end $$;
revoke all on function public.change_option_vote(uuid, uuid) from public, anon;
grant execute on function public.change_option_vote(uuid, uuid) to authenticated;

-- Conteggi per proposta (validi anche per le decisioni anonime)
create or replace function public.poll_option_tallies(p_building uuid)
returns table(poll_id uuid, option_id uuid, votes int)
language sql stable security definer set search_path = public as $$
  select o.poll_id, o.id, count(v.*)::int
    from poll_options o join polls p on p.id = o.poll_id
    left join poll_option_votes v on v.option_id = o.id
   where p.building_id = p_building and is_member(p_building)
   group by o.poll_id, o.id
$$;
revoke all on function public.poll_option_tallies(uuid) from public, anon;
grant execute on function public.poll_option_tallies(uuid) to authenticated;

-- Chiusura automatica della fase 2: vince la proposta più votata
-- (a parità, quella inserita prima).
create or replace function public.close_expired_phase2()
returns void language plpgsql security definer set search_path = public as $$
begin
  perform set_config('condoreco.phase2_system', 'on', true);
  update polls p set phase2_status = 'closed',
         phase2_winner = (
           select o.id from poll_options o left join poll_option_votes v on v.option_id = o.id
            where o.poll_id = p.id group by o.id, o.position, o.created_at
           having count(v.*) > 0
            order by count(v.*) desc, o.position, o.created_at limit 1)
   where p.phase2_status = 'open' and p.phase2_closes_at <= now();
  perform set_config('condoreco.phase2_system', 'off', true);
end $$;
revoke all on function public.close_expired_phase2() from public, anon, authenticated;

select cron.unschedule('close-expired-phase2') where exists (select 1 from cron.job where jobname = 'close-expired-phase2');
select cron.schedule('close-expired-phase2', '6 * * * *', 'select public.close_expired_phase2()');

-- Il messaggio della fase 1 non deve essere confuso con quello della fase 2
create or replace function public.post_poll_to_chat()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'open' and (tg_op = 'INSERT' or old.status is distinct from 'open')
     and not exists (select 1 from messages m where m.kind = 'poll' and m.ref_id = new.id and coalesce(m.meta->>'phase', '1') = '1') then
    perform set_config('condoreco.system_post', 'on', true);
    insert into messages (building_id, created_by, content, kind, ref_id)
    values (new.building_id, new.created_by, left('Sondaggio: ' || new.question, 2000), 'poll', new.id);
    perform set_config('condoreco.system_post', 'off', true);
  end if;
  return new;
end $$;

-- Immagini delle proposte: bucket privato, <building>/<poll>/<file>
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('poll-images', 'poll-images', false, 10485760, array['image/jpeg','image/png','image/webp','image/gif','image/heic'])
on conflict (id) do update set public = false, file_size_limit = 10485760, allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.poll_image_access(p_name text, p_write boolean)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  parts text[] := string_to_array(p_name, '/');
  uuid_re constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
begin
  if array_length(parts, 1) <> 3 or parts[1] !~ uuid_re or parts[2] !~ uuid_re then return false; end if;
  if not exists (select 1 from polls p where p.id = parts[2]::uuid and p.building_id = parts[1]::uuid) then return false; end if;
  if p_write then return can_edit_poll_options(parts[2]::uuid); end if;
  return is_member(parts[1]::uuid);
end $$;
revoke all on function public.poll_image_access(text, boolean) from public, anon;
grant execute on function public.poll_image_access(text, boolean) to authenticated;

drop policy if exists "poll images: read" on storage.objects;
create policy "poll images: read" on storage.objects for select to authenticated
  using (bucket_id = 'poll-images' and public.poll_image_access(name, false));
drop policy if exists "poll images: upload" on storage.objects;
create policy "poll images: upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'poll-images' and public.poll_image_access(name, true));
drop policy if exists "poll images: delete" on storage.objects;
create policy "poll images: delete" on storage.objects for delete to authenticated
  using (bucket_id = 'poll-images' and (owner = auth.uid() or public.poll_image_access(name, true)));
