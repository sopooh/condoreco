-- Verifica di residenza con Condor:
--  * il richiedente fa controllare il documento PRIMA di inviare (edge function
--    residence-precheck): l'esito va in residence_checks e, quando la richiesta
--    viene creata, un trigger lo copia in condo_join_requests.ai_check
--  * dopo la decisione il file viene cancellato (come prima) ma l'esito del
--    controllo resta sulla richiesta: e' l'archivio delle verifiche
--  * nuovo tipo di documento: autocertificazione (DPR 445/2000) firmata,
--    con copia del documento d'identita' nello stesso PDF
alter table public.condo_join_requests add column if not exists ai_check jsonb;

alter table public.condo_join_requests drop constraint if exists condo_join_requests_document_type_check;
alter table public.condo_join_requests add constraint condo_join_requests_document_type_check
  check (document_type = any (array['certificato','affitto','rogito','bolletta','autocertificazione']));

create table if not exists public.residence_checks (
  id uuid primary key default gen_random_uuid(),
  document_path text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  building_id uuid not null references public.buildings(id) on delete cascade,
  report jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists residence_checks_path_idx on public.residence_checks (document_path);
create index if not exists residence_checks_user_idx on public.residence_checks (user_id, created_at);
alter table public.residence_checks enable row level security; -- solo service role

create or replace function public.attach_residence_check()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.ai_check is null then
    select report || jsonb_build_object('checked_at', created_at) into new.ai_check
      from residence_checks
     where document_path = new.document_path and user_id = new.user_id
     order by created_at desc limit 1;
  end if;
  return new;
end $$;
drop trigger if exists condo_join_requests_ai_check on public.condo_join_requests;
create trigger condo_join_requests_ai_check before insert on public.condo_join_requests
  for each row execute function public.attach_residence_check();

-- le richieste in attesa ora portano anche l'esito di Condor
drop function if exists public.pending_join_requests(uuid);
create function public.pending_join_requests(p_building uuid default null)
returns table(id uuid, building_id uuid, building_address text, user_id uuid, display_name text,
              document_type text, document_path text, floor text, millesimi numeric, tenure text,
              created_at timestamptz, ai_check jsonb)
language sql stable security definer set search_path = public as $$
  select r.id, r.building_id, trim(concat_ws(' ', b.address, b.street_number, '·', b.city)),
         r.user_id, p.display_name, r.document_type, r.document_path, r.floor, r.millesimi, r.tenure, r.created_at, r.ai_check
    from condo_join_requests r
    join buildings b on b.id = r.building_id
    left join profiles p on p.id = r.user_id
   where r.status = 'pending'
     and (p_building is null or r.building_id = p_building)
     and public.can_review_join(r.building_id)
   order by r.created_at
$$;
revoke all on function public.pending_join_requests(uuid) from public, anon;
grant execute on function public.pending_join_requests(uuid) to authenticated;

-- archivio delle verifiche decise (senza file: solo dati ed esito del controllo)
create or replace function public.decided_join_requests(p_building uuid default null)
returns table(id uuid, building_id uuid, building_address text, display_name text, document_type text,
              status text, reason text, floor text, tenure text, created_at timestamptz,
              reviewed_at timestamptz, reviewer_name text, ai_check jsonb)
language sql stable security definer set search_path = public as $$
  select r.id, r.building_id, trim(concat_ws(' ', b.address, b.street_number, '·', b.city)),
         p.display_name, r.document_type, r.status, r.reason, r.floor, r.tenure, r.created_at,
         r.reviewed_at, rv.display_name, r.ai_check
    from condo_join_requests r
    join buildings b on b.id = r.building_id
    left join profiles p on p.id = r.user_id
    left join profiles rv on rv.id = r.reviewed_by
   where r.status in ('approved', 'rejected')
     and (p_building is null or r.building_id = p_building)
     and public.can_review_join(r.building_id)
   order by r.reviewed_at desc nulls last
   limit 300
$$;
revoke all on function public.decided_join_requests(uuid) from public, anon;
grant execute on function public.decided_join_requests(uuid) to authenticated;

-- pulizia: gli esiti dei controlli non usati restano al massimo 7 giorni
select cron.schedule('residence_checks_cleanup', '23 3 * * *',
  $$delete from public.residence_checks where created_at < now() - interval '7 days'$$);
