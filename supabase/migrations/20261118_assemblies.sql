-- Assemblee di condominio digitali.
-- Riferimenti di legge seguiti (verificati il 18/11/2026):
-- - art. 66 disp. att. c.c.: convocazione almeno 5 giorni prima della prima
--   convocazione, solo via raccomandata, PEC, fax o consegna a mano. La notifica
--   in app è una copia di cortesia, non sostituisce questi canali.
--   Videoconferenza: serve il consenso preventivo della maggioranza dei condomini
--   (per teste) se il regolamento non la prevede; il verbale va trasmesso con le
--   stesse formalità della convocazione.
-- - art. 1136 c.c.: quorum costitutivi e deliberativi (funzione assembly_tally).
-- - art. 67 disp. att. c.c.: deleghe scritte; oltre 20 condomini un delegato non
--   rappresenta più di 1/5 dei condomini e del valore; l'amministratore non può
--   ricevere deleghe (funzione assembly_proxy_warnings).
-- Le "teste" sono calcolate per unità: i comproprietari di un'unità contano come
-- un condomino; chi possiede più unità da solo conta una volta.

-- Indirizzi per la convocazione legale (PEC o indirizzo postale, se diverso dall'edificio)
alter table public.condo_unit_people add column if not exists pec text check (pec is null or char_length(pec) <= 200);
alter table public.condo_unit_people add column if not exists postal_address text check (postal_address is null or char_length(postal_address) <= 200);
alter table public.condo_unit_people add column if not exists postal_cap text check (postal_cap is null or postal_cap ~ '^[0-9]{5}$');
alter table public.condo_unit_people add column if not exists postal_city text check (postal_city is null or char_length(postal_city) <= 80);
alter table public.condo_unit_people add column if not exists postal_province text check (postal_province is null or postal_province ~ '^[A-Z]{2}$');

create table if not exists public.condo_assemblies (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id) on delete cascade,
  kind text not null default 'ordinary' check (kind in ('ordinary', 'extraordinary')),
  title text not null check (char_length(title) between 3 and 160),
  mode text not null default 'in_person' check (mode in ('in_person', 'video', 'mixed')),
  location text check (location is null or char_length(location) <= 300),
  video_link text check (video_link is null or char_length(video_link) <= 500),
  first_call_at timestamptz,
  second_call_at timestamptz,
  status text not null default 'draft'
    check (status in ('draft', 'consent', 'convened', 'in_session', 'closed', 'minutes_final', 'cancelled')),
  session_call text check (session_call in ('first', 'second')),
  president_name text check (president_name is null or char_length(president_name) <= 120),
  secretary_name text check (secretary_name is null or char_length(secretary_name) <= 120),
  recording_consent boolean not null default false,
  video_by_regulation boolean not null default false,
  opened_at timestamptz,
  closed_at timestamptz,
  convened_at timestamptz,
  convocation_document_id uuid references public.condo_documents(id) on delete set null,
  minutes_document_id uuid references public.condo_documents(id) on delete set null,
  notes text check (notes is null or char_length(notes) <= 2000),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (second_call_at is null or first_call_at is null or second_call_at > first_call_at)
);
create index if not exists condo_assemblies_building_idx on public.condo_assemblies (building_id, first_call_at desc);

create table if not exists public.condo_assembly_items (
  id uuid primary key default gen_random_uuid(),
  assembly_id uuid not null references public.condo_assemblies(id) on delete cascade,
  building_id uuid not null references public.buildings(id) on delete cascade,
  position int not null default 1,
  title text not null check (char_length(title) between 3 and 300),
  description text check (description is null or char_length(description) <= 3000),
  majority_rule text not null default 'ordinary'
    check (majority_rule in ('info', 'ordinary', 'art1136_c4', 'innov_1120_c2', 'innov_1120_c1', 'unanimity')),
  millesimi_table_id uuid references public.condo_millesimi_tables(id) on delete set null,
  source jsonb not null default '{}'::jsonb,
  ai_generated boolean not null default false,
  outcome text check (outcome in ('approved', 'rejected', 'postponed', 'info')),
  outcome_note text check (outcome_note is null or char_length(outcome_note) <= 2000),
  created_at timestamptz not null default now()
);
create index if not exists condo_assembly_items_assembly_idx on public.condo_assembly_items (assembly_id, position);

create table if not exists public.condo_assembly_video_consents (
  assembly_id uuid not null references public.condo_assemblies(id) on delete cascade,
  unit_id uuid not null references public.condo_units(id) on delete cascade,
  building_id uuid not null references public.buildings(id) on delete cascade,
  consent boolean not null,
  answered_by uuid default auth.uid() references auth.users(id) on delete set null,
  answered_at timestamptz not null default now(),
  primary key (assembly_id, unit_id)
);

create table if not exists public.condo_assembly_recipients (
  id uuid primary key default gen_random_uuid(),
  assembly_id uuid not null references public.condo_assemblies(id) on delete cascade,
  building_id uuid not null references public.buildings(id) on delete cascade,
  purpose text not null default 'convocation' check (purpose in ('convocation', 'minutes')),
  unit_id uuid references public.condo_units(id) on delete set null,
  person_id uuid references public.condo_unit_people(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  channel text not null check (channel in ('pec', 'raccomandata', 'hand', 'none')),
  pec text,
  postal jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'sending', 'sent', 'accepted', 'delivered', 'failed', 'manual_done')),
  provider text check (provider in ('openapi_pec', 'openapi_raccomandata', 'manual')),
  provider_ref text,
  sent_by uuid references auth.users(id) on delete set null,
  sent_at timestamptz,
  delivered_at timestamptz,
  receipt_document_id uuid references public.condo_documents(id) on delete set null,
  error text,
  app_read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (assembly_id, purpose, person_id)
);
create index if not exists condo_assembly_recipients_assembly_idx on public.condo_assembly_recipients (assembly_id, purpose);
create index if not exists condo_assembly_recipients_poll_idx on public.condo_assembly_recipients (status) where status in ('sending', 'sent', 'accepted');

create table if not exists public.condo_assembly_proxies (
  id uuid primary key default gen_random_uuid(),
  assembly_id uuid not null references public.condo_assemblies(id) on delete cascade,
  building_id uuid not null references public.buildings(id) on delete cascade,
  unit_id uuid not null references public.condo_units(id) on delete cascade,
  grantor_name text not null check (char_length(grantor_name) between 2 and 120),
  delegate_name text not null check (char_length(delegate_name) between 2 and 120),
  delegate_user_id uuid references auth.users(id) on delete set null,
  delegate_unit_id uuid references public.condo_units(id) on delete set null,
  document_id uuid references public.condo_documents(id) on delete set null,
  status text not null default 'submitted' check (status in ('submitted', 'accepted', 'rejected')),
  note text check (note is null or char_length(note) <= 500),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (assembly_id, unit_id)
);

create table if not exists public.condo_assembly_attendance (
  assembly_id uuid not null references public.condo_assemblies(id) on delete cascade,
  unit_id uuid not null references public.condo_units(id) on delete cascade,
  building_id uuid not null references public.buildings(id) on delete cascade,
  attendee_name text not null check (char_length(attendee_name) between 2 and 120),
  via text not null check (via in ('in_person', 'video', 'proxy')),
  proxy_id uuid references public.condo_assembly_proxies(id) on delete set null,
  present boolean not null default true,
  arrived_at timestamptz not null default now(),
  left_at timestamptz,
  primary key (assembly_id, unit_id)
);

create table if not exists public.condo_assembly_votes (
  item_id uuid not null references public.condo_assembly_items(id) on delete cascade,
  unit_id uuid not null references public.condo_units(id) on delete cascade,
  assembly_id uuid not null references public.condo_assemblies(id) on delete cascade,
  building_id uuid not null references public.buildings(id) on delete cascade,
  vote text not null check (vote in ('yes', 'no', 'abstain')),
  recorded_at timestamptz not null default now(),
  primary key (item_id, unit_id)
);
create index if not exists condo_assembly_votes_assembly_idx on public.condo_assembly_votes (assembly_id);

create table if not exists public.condo_assembly_recordings (
  id uuid primary key default gen_random_uuid(),
  assembly_id uuid not null references public.condo_assemblies(id) on delete cascade,
  building_id uuid not null references public.buildings(id) on delete cascade,
  segment int not null,
  file_path text,
  mime_type text,
  size_bytes bigint,
  status text not null default 'uploaded' check (status in ('uploaded', 'transcribing', 'done', 'error')),
  transcript text,
  error text,
  attempts int not null default 0,
  created_at timestamptz not null default now(),
  unique (assembly_id, segment)
);

create table if not exists public.condo_assembly_minutes (
  assembly_id uuid primary key references public.condo_assemblies(id) on delete cascade,
  building_id uuid not null references public.buildings(id) on delete cascade,
  draft text check (draft is null or char_length(draft) <= 60000),
  summary text check (summary is null or char_length(summary) <= 4000),
  generated_at timestamptz,
  finalized_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Coerenza edificio per tutte le tabelle figlie
create or replace function public.check_assembly_child()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from condo_assemblies a where a.id = new.assembly_id and a.building_id = new.building_id) then
    raise exception 'assembly does not belong to this building' using errcode = '23514';
  end if;
  return new;
end $$;
revoke all on function public.check_assembly_child() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['condo_assembly_items', 'condo_assembly_video_consents', 'condo_assembly_recipients',
                           'condo_assembly_proxies', 'condo_assembly_attendance', 'condo_assembly_votes',
                           'condo_assembly_recordings', 'condo_assembly_minutes'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_building', t);
    execute format('create trigger %I before insert or update on public.%I for each row execute function public.check_assembly_child()', t || '_building', t);
  end loop;
end $$;

drop trigger if exists condo_assemblies_touch on public.condo_assemblies;
create trigger condo_assemblies_touch before update on public.condo_assemblies
  for each row execute function public.set_updated_at();
drop trigger if exists condo_assembly_minutes_touch on public.condo_assembly_minutes;
create trigger condo_assembly_minutes_touch before update on public.condo_assembly_minutes
  for each row execute function public.set_updated_at();

-- ---------- Regole di accesso ----------
-- Unità di cui l'utente è titolare (proprietario, nudo proprietario, usufruttuario) o inquilino
create or replace function public.my_unit_ids(p_building uuid)
returns setof uuid language sql stable security definer set search_path = public as $$
  select distinct unit_id from condo_unit_people
  where building_id = p_building and user_id = auth.uid() and (until is null or until >= current_date)
$$;
revoke all on function public.my_unit_ids(uuid) from public, anon;
grant execute on function public.my_unit_ids(uuid) to authenticated;

create or replace function public.assembly_visible(p_assembly uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from condo_assemblies a
                 where a.id = p_assembly
                   and (public.is_condo_admin(a.building_id)
                        or (public.is_member(a.building_id) and a.status <> 'draft')))
$$;
revoke all on function public.assembly_visible(uuid) from public, anon;
grant execute on function public.assembly_visible(uuid) to authenticated;

alter table public.condo_assemblies enable row level security;
alter table public.condo_assembly_items enable row level security;
alter table public.condo_assembly_video_consents enable row level security;
alter table public.condo_assembly_recipients enable row level security;
alter table public.condo_assembly_proxies enable row level security;
alter table public.condo_assembly_attendance enable row level security;
alter table public.condo_assembly_votes enable row level security;
alter table public.condo_assembly_recordings enable row level security;
alter table public.condo_assembly_minutes enable row level security;

revoke all on public.condo_assemblies, public.condo_assembly_items, public.condo_assembly_video_consents,
  public.condo_assembly_recipients, public.condo_assembly_proxies, public.condo_assembly_attendance,
  public.condo_assembly_votes, public.condo_assembly_recordings, public.condo_assembly_minutes from anon;
grant select, insert, update, delete on public.condo_assemblies, public.condo_assembly_items, public.condo_assembly_video_consents,
  public.condo_assembly_recipients, public.condo_assembly_proxies, public.condo_assembly_attendance,
  public.condo_assembly_votes, public.condo_assembly_recordings, public.condo_assembly_minutes to authenticated;

-- assemblee e ordine del giorno: i membri leggono quelle convocate; l'admin gestisce
drop policy if exists "assemblies: read" on public.condo_assemblies;
create policy "assemblies: read" on public.condo_assemblies for select to authenticated
  using (public.is_condo_admin(building_id) or (public.is_member(building_id) and status <> 'draft'));
drop policy if exists "assemblies: admin write" on public.condo_assemblies;
create policy "assemblies: admin write" on public.condo_assemblies for all to authenticated
  using (public.is_condo_admin(building_id)) with check (public.is_condo_admin(building_id));

drop policy if exists "assembly items: read" on public.condo_assembly_items;
create policy "assembly items: read" on public.condo_assembly_items for select to authenticated
  using (public.assembly_visible(assembly_id));
drop policy if exists "assembly items: admin write" on public.condo_assembly_items;
create policy "assembly items: admin write" on public.condo_assembly_items for all to authenticated
  using (public.is_condo_admin(building_id)) with check (public.is_condo_admin(building_id));

-- consenso alla videoconferenza: ogni titolare risponde per la propria unità
drop policy if exists "video consents: read" on public.condo_assembly_video_consents;
create policy "video consents: read" on public.condo_assembly_video_consents for select to authenticated
  using (public.is_condo_admin(building_id) or unit_id in (select public.my_unit_ids(building_id)));
drop policy if exists "video consents: own write" on public.condo_assembly_video_consents;
create policy "video consents: own write" on public.condo_assembly_video_consents for insert to authenticated
  with check (unit_id in (select public.my_unit_ids(building_id))
              and exists (select 1 from condo_assemblies a where a.id = assembly_id and a.status = 'consent'));
drop policy if exists "video consents: own update" on public.condo_assembly_video_consents;
create policy "video consents: own update" on public.condo_assembly_video_consents for update to authenticated
  using (unit_id in (select public.my_unit_ids(building_id)))
  with check (unit_id in (select public.my_unit_ids(building_id))
              and exists (select 1 from condo_assemblies a where a.id = assembly_id and a.status = 'consent'));
drop policy if exists "video consents: admin" on public.condo_assembly_video_consents;
create policy "video consents: admin" on public.condo_assembly_video_consents for all to authenticated
  using (public.is_condo_admin(building_id)) with check (public.is_condo_admin(building_id));

-- destinatari: dati personali (PEC, indirizzi). Admin; il condomino vede solo i propri
drop policy if exists "recipients: read" on public.condo_assembly_recipients;
create policy "recipients: read" on public.condo_assembly_recipients for select to authenticated
  using (public.is_condo_admin(building_id) or user_id = auth.uid());
drop policy if exists "recipients: admin write" on public.condo_assembly_recipients;
create policy "recipients: admin write" on public.condo_assembly_recipients for all to authenticated
  using (public.is_condo_admin(building_id)) with check (public.is_condo_admin(building_id));

-- deleghe: il titolare la presenta per la propria unità finché l'assemblea non si apre
drop policy if exists "proxies: read" on public.condo_assembly_proxies;
create policy "proxies: read" on public.condo_assembly_proxies for select to authenticated
  using (public.is_condo_admin(building_id) or unit_id in (select public.my_unit_ids(building_id)) or delegate_user_id = auth.uid());
drop policy if exists "proxies: own insert" on public.condo_assembly_proxies;
create policy "proxies: own insert" on public.condo_assembly_proxies for insert to authenticated
  with check (unit_id in (select public.my_unit_ids(building_id)) and status = 'submitted'
              and exists (select 1 from condo_assemblies a where a.id = assembly_id and a.status in ('consent', 'convened')));
drop policy if exists "proxies: own delete" on public.condo_assembly_proxies;
create policy "proxies: own delete" on public.condo_assembly_proxies for delete to authenticated
  using (unit_id in (select public.my_unit_ids(building_id)) and status = 'submitted');
drop policy if exists "proxies: admin" on public.condo_assembly_proxies;
create policy "proxies: admin" on public.condo_assembly_proxies for all to authenticated
  using (public.is_condo_admin(building_id)) with check (public.is_condo_admin(building_id));

-- presenze e voti: li registra l'admin (presidente/segretario); i membri leggono dopo la chiusura
drop policy if exists "attendance: read" on public.condo_assembly_attendance;
create policy "attendance: read" on public.condo_assembly_attendance for select to authenticated
  using (public.is_condo_admin(building_id)
         or exists (select 1 from condo_assemblies a where a.id = assembly_id and a.status in ('closed', 'minutes_final') and public.is_member(a.building_id)));
drop policy if exists "attendance: admin" on public.condo_assembly_attendance;
create policy "attendance: admin" on public.condo_assembly_attendance for all to authenticated
  using (public.is_condo_admin(building_id)) with check (public.is_condo_admin(building_id));

drop policy if exists "votes: read" on public.condo_assembly_votes;
create policy "votes: read" on public.condo_assembly_votes for select to authenticated
  using (public.is_condo_admin(building_id)
         or exists (select 1 from condo_assemblies a where a.id = assembly_id and a.status in ('closed', 'minutes_final') and public.is_member(a.building_id)));
drop policy if exists "votes: admin" on public.condo_assembly_votes;
create policy "votes: admin" on public.condo_assembly_votes for all to authenticated
  using (public.is_condo_admin(building_id)) with check (public.is_condo_admin(building_id));

-- registrazioni e trascrizioni: solo admin
drop policy if exists "recordings: admin" on public.condo_assembly_recordings;
create policy "recordings: admin" on public.condo_assembly_recordings for all to authenticated
  using (public.is_condo_admin(building_id)) with check (public.is_condo_admin(building_id));

-- verbale: bozza solo admin; definitivo e riassunto per tutti i membri
drop policy if exists "minutes: read" on public.condo_assembly_minutes;
create policy "minutes: read" on public.condo_assembly_minutes for select to authenticated
  using (public.is_condo_admin(building_id)
         or (finalized_at is not null and public.is_member(building_id)
             and exists (select 1 from condo_assemblies a where a.id = assembly_id and a.status = 'minutes_final')));
drop policy if exists "minutes: admin" on public.condo_assembly_minutes;
create policy "minutes: admin" on public.condo_assembly_minutes for all to authenticated
  using (public.is_condo_admin(building_id)) with check (public.is_condo_admin(building_id));

-- ---------- Teste e valori ----------
-- Per ogni unità: chiave "testa" (titolari attuali) e millesimi nella tabella indicata,
-- riportati su base 1000.
create or replace function public.assembly_units(p_building uuid, p_table uuid)
returns table (unit_id uuid, unit_code text, head_key text, holders text, value numeric)
language sql stable security definer set search_path = public as $$
  with tbl as (
    select t.id, t.total from condo_millesimi_tables t
    where t.building_id = p_building
      and (t.id = p_table or (p_table is null and t.kind = 'ownership'))
    limit 1
  ),
  holders as (
    select p.unit_id,
           string_agg(coalesce(p.user_id::text, lower(trim(p.full_name))), '|' order by coalesce(p.user_id::text, lower(trim(p.full_name)))) as hk,
           string_agg(p.full_name, ', ' order by p.full_name) as names
    from condo_unit_people p
    where p.building_id = p_building and p.role in ('owner', 'bare_owner', 'usufructuary')
      and (p.until is null or p.until >= current_date)
    group by p.unit_id
  )
  select u.id, u.code, coalesce(h.hk, 'unit:' || u.id::text), coalesce(h.names, u.code),
         round(coalesce(um.value, 0) * 1000 / nullif((select total from tbl), 0), 4)
  from condo_units u
  left join holders h on h.unit_id = u.id
  left join condo_unit_millesimi um on um.unit_id = u.id and um.table_id = (select id from tbl)
  where u.building_id = p_building and coalesce(um.value, 0) > 0
$$;
revoke all on function public.assembly_units(uuid, uuid) from public, anon, authenticated;

-- Conteggio: costituzione (art. 1136 c. 1 e 3) ed esito di ogni punto per la sua maggioranza.
-- Visibile all'admin sempre, ai membri dopo la chiusura.
create or replace function public.assembly_tally(p_assembly uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  a record;
  heads_total int; value_total numeric;
  heads_present int; value_present numeric;
  constituted boolean;
  items jsonb := '[]'::jsonb;
  it record;
  yes_h int; yes_v numeric; no_h int; no_v numeric; abs_h int; abs_v numeric;
  ih_present int; iv_present numeric; ih_total int;
  passed boolean; need text;
  v_second boolean;
begin
  select * into a from condo_assemblies where id = p_assembly;
  if a.id is null then raise exception 'not found' using errcode = 'P0002'; end if;
  if not (public.is_condo_admin(a.building_id)
          or (public.is_member(a.building_id) and a.status in ('closed', 'minutes_final'))) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  v_second := coalesce(a.session_call, 'second') = 'second';

  select count(distinct head_key), coalesce(sum(value), 0) into heads_total, value_total
  from assembly_units(a.building_id, null);

  select count(distinct u.head_key), coalesce(sum(u.value), 0) into heads_present, value_present
  from assembly_units(a.building_id, null) u
  join condo_assembly_attendance att on att.unit_id = u.unit_id and att.assembly_id = a.id and att.present;

  if v_second then
    constituted := heads_present * 3 >= heads_total and value_present * 3 >= 1000 and heads_total > 0;
  else
    constituted := heads_present * 2 > heads_total and value_present * 3 >= 2000 and heads_total > 0;
  end if;

  for it in select * from condo_assembly_items where assembly_id = a.id order by position loop
    -- valori nella tabella del punto (se diversa dalla A)
    select count(distinct u.head_key) into ih_total from assembly_units(a.building_id, it.millesimi_table_id) u;
    select count(distinct u.head_key), coalesce(sum(u.value), 0) into ih_present, iv_present
      from assembly_units(a.building_id, it.millesimi_table_id) u
      join condo_assembly_attendance att on att.unit_id = u.unit_id and att.assembly_id = a.id and att.present;
    select count(distinct u.head_key) filter (where v.vote = 'yes'), coalesce(sum(u.value) filter (where v.vote = 'yes'), 0),
           count(distinct u.head_key) filter (where v.vote = 'no'), coalesce(sum(u.value) filter (where v.vote = 'no'), 0),
           count(distinct u.head_key) filter (where v.vote = 'abstain'), coalesce(sum(u.value) filter (where v.vote = 'abstain'), 0)
      into yes_h, yes_v, no_h, no_v, abs_h, abs_v
      from condo_assembly_votes v
      join assembly_units(a.building_id, it.millesimi_table_id) u on u.unit_id = v.unit_id
      where v.item_id = it.id;

    if it.majority_rule = 'info' then
      passed := null; need := 'Nessuna votazione';
    elsif it.majority_rule = 'ordinary' and v_second then
      passed := yes_h * 2 > ih_present and yes_v * 3 >= 1000; need := 'Maggioranza degli intervenuti e almeno 1/3 del valore (334 millesimi)';
    elsif it.majority_rule = 'ordinary' then
      passed := yes_h * 2 > ih_present and yes_v * 2 >= 1000; need := 'Maggioranza degli intervenuti e almeno 500 millesimi';
    elsif it.majority_rule in ('art1136_c4', 'innov_1120_c2') then
      passed := yes_h * 2 > ih_present and yes_v * 2 >= 1000; need := 'Maggioranza degli intervenuti e almeno 500 millesimi';
    elsif it.majority_rule = 'innov_1120_c1' then
      passed := yes_h * 2 > ih_total and yes_v * 3 >= 2000; need := 'Maggioranza dei condomini e almeno 2/3 del valore (667 millesimi)';
    else
      passed := yes_h = ih_total and yes_v >= 999.999; need := 'Unanimità di tutti i condomini';
    end if;

    items := items || jsonb_build_object(
      'item_id', it.id, 'position', it.position, 'title', it.title, 'majority_rule', it.majority_rule, 'requirement', need,
      'heads_total', ih_total, 'heads_present', ih_present, 'value_present', round(iv_present, 3),
      'yes_heads', yes_h, 'yes_value', round(yes_v, 3), 'no_heads', no_h, 'no_value', round(no_v, 3),
      'abstain_heads', abs_h, 'abstain_value', round(abs_v, 3),
      'passed', case when constituted then passed else false end);
  end loop;

  return jsonb_build_object(
    'call', case when v_second then 'second' else 'first' end,
    'heads_total', heads_total, 'value_total', round(value_total, 3),
    'heads_present', heads_present, 'value_present', round(value_present, 3),
    'constituted', constituted,
    'constitution_rule', case when v_second
      then 'Seconda convocazione: almeno 1/3 dei condomini e 1/3 del valore'
      else 'Prima convocazione: maggioranza dei condomini e almeno 2/3 del valore' end,
    'items', items);
end $$;
revoke all on function public.assembly_tally(uuid) from public, anon;
grant execute on function public.assembly_tally(uuid) to authenticated;

-- Consenso alla videoconferenza: maggioranza dei condomini (per teste), solo admin.
create or replace function public.assembly_video_consent_status(p_assembly uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare a record; v_total int; v_yes int; v_no int;
begin
  select * into a from condo_assemblies where id = p_assembly;
  if a.id is null or not public.is_condo_admin(a.building_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select count(distinct head_key) into v_total from assembly_units(a.building_id, null);
  select count(distinct u.head_key) filter (where c.consent), count(distinct u.head_key) filter (where not c.consent)
    into v_yes, v_no
    from condo_assembly_video_consents c join assembly_units(a.building_id, null) u on u.unit_id = c.unit_id
    where c.assembly_id = a.id;
  return jsonb_build_object('heads_total', v_total, 'yes', v_yes, 'no', v_no, 'reached', v_total > 0 and v_yes * 2 > v_total);
end $$;
revoke all on function public.assembly_video_consent_status(uuid) from public, anon;
grant execute on function public.assembly_video_consent_status(uuid) to authenticated;

-- Controlli sulle deleghe (art. 67 disp. att.): avvisi, non blocchi.
create or replace function public.assembly_proxy_warnings(p_assembly uuid)
returns table (delegate_name text, units int, heads int, value numeric, warning text)
language plpgsql stable security definer set search_path = public as $$
declare a record; heads_total int;
begin
  select * into a from condo_assemblies where id = p_assembly;
  if a.id is null or not public.is_condo_admin(a.building_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select count(distinct head_key) into heads_total from assembly_units(a.building_id, null);
  return query
  select p.delegate_name, count(*)::int, count(distinct u.head_key)::int, round(coalesce(sum(u.value), 0), 3),
         case
           when exists (select 1 from condo_members m where m.building_id = a.building_id and m.role = 'admin' and m.user_id = p.delegate_user_id)
             then 'L''amministratore non può ricevere deleghe'
           when heads_total > 20 and (count(distinct u.head_key) * 5 > heads_total or coalesce(sum(u.value), 0) * 5 > 1000)
             then 'Oltre 1/5 dei condomini o del valore: non ammesso con più di 20 condomini'
           else null
         end
  from condo_assembly_proxies p
  left join assembly_units(a.building_id, null) u on u.unit_id = p.unit_id
  where p.assembly_id = a.id and p.status <> 'rejected'
  group by p.delegate_name, p.delegate_user_id;
end $$;
revoke all on function public.assembly_proxy_warnings(uuid) from public, anon;
grant execute on function public.assembly_proxy_warnings(uuid) to authenticated;

-- Il condomino segna di aver letto la convocazione in app (copia di cortesia)
create or replace function public.assembly_mark_read(p_assembly uuid)
returns void language sql security definer set search_path = public as $$
  update condo_assembly_recipients set app_read_at = coalesce(app_read_at, now())
  where assembly_id = p_assembly and user_id = auth.uid()
$$;
revoke all on function public.assembly_mark_read(uuid) from public, anon;
grant execute on function public.assembly_mark_read(uuid) to authenticated;

-- Prepara i destinatari dall'anagrafe: un destinatario per titolare attuale.
-- PEC se indicata, altrimenti raccomandata all'indirizzo postale (o dell'edificio).
create or replace function public.assembly_prepare_recipients(p_assembly uuid, p_purpose text default 'convocation')
returns int language plpgsql security definer set search_path = public as $$
declare a record; b record; n int;
begin
  select * into a from condo_assemblies where id = p_assembly;
  if a.id is null or not public.is_condo_admin(a.building_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_purpose not in ('convocation', 'minutes') then raise exception 'bad purpose'; end if;
  select address, street_number, postal_code, city, province into b from buildings where id = a.building_id;

  insert into condo_assembly_recipients (assembly_id, building_id, purpose, unit_id, person_id, user_id, full_name, channel, pec, postal)
  select a.id, a.building_id, p_purpose, p.unit_id, p.id, p.user_id, p.full_name,
         case when p.pec is not null then 'pec' else 'raccomandata' end,
         p.pec,
         jsonb_build_object(
           'address', coalesce(p.postal_address, concat_ws(' ', b.address, b.street_number) || ' (int. ' || u.code || ')'),
           'cap', coalesce(p.postal_cap, b.postal_code),
           'city', coalesce(p.postal_city, b.city),
           'province', coalesce(p.postal_province, case when char_length(b.province) = 2 then upper(b.province) end)
         )
  from condo_unit_people p
  join condo_units u on u.id = p.unit_id
  where p.building_id = a.building_id and p.role in ('owner', 'bare_owner', 'usufructuary')
    and (p.until is null or p.until >= current_date)
  on conflict (assembly_id, purpose, person_id) do nothing;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.assembly_prepare_recipients(uuid, text) from public, anon;
grant execute on function public.assembly_prepare_recipients(uuid, text) to authenticated;

-- ---------- Impostazioni di invio dell'amministratore (credenziali in Vault) ----------
create table if not exists public.admin_sending_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  sender_name text check (sender_name is null or char_length(sender_name) <= 120),
  sender_address text check (sender_address is null or char_length(sender_address) <= 200),
  sender_cap text check (sender_cap is null or sender_cap ~ '^[0-9]{5}$'),
  sender_city text check (sender_city is null or char_length(sender_city) <= 80),
  sender_province text check (sender_province is null or sender_province ~ '^[A-Z]{2}$'),
  sender_email text check (sender_email is null or char_length(sender_email) <= 200),
  pec_address text check (pec_address is null or char_length(pec_address) <= 200),
  pec_username text check (pec_username is null or char_length(pec_username) <= 200),
  pec_secret_id uuid,
  updated_at timestamptz not null default now()
);
alter table public.admin_sending_settings enable row level security;
revoke all on public.admin_sending_settings from anon, authenticated;
grant select (user_id, sender_name, sender_address, sender_cap, sender_city, sender_province, sender_email, pec_address, pec_username, updated_at)
  on public.admin_sending_settings to authenticated;
drop policy if exists "sending settings: own read" on public.admin_sending_settings;
create policy "sending settings: own read" on public.admin_sending_settings for select to authenticated using (user_id = auth.uid());

create or replace function public.save_sending_settings(
  p_sender_name text, p_sender_address text, p_sender_cap text, p_sender_city text, p_sender_province text,
  p_sender_email text, p_pec_address text, p_pec_username text, p_pec_password text)
returns void language plpgsql security definer set search_path = public, vault as $$
declare v_secret uuid;
begin
  if auth.uid() is null then raise exception 'not allowed' using errcode = '42501'; end if;
  insert into admin_sending_settings (user_id) values (auth.uid()) on conflict (user_id) do nothing;
  select pec_secret_id into v_secret from admin_sending_settings where user_id = auth.uid();
  if p_pec_password is not null and p_pec_password <> '' then
    if v_secret is null then
      v_secret := vault.create_secret(p_pec_password, 'pec_' || auth.uid()::text, 'PEC password for assembly convocations');
    else
      perform vault.update_secret(v_secret, p_pec_password);
    end if;
  end if;
  update admin_sending_settings set
    sender_name = nullif(trim(p_sender_name), ''), sender_address = nullif(trim(p_sender_address), ''),
    sender_cap = nullif(trim(p_sender_cap), ''), sender_city = nullif(trim(p_sender_city), ''),
    sender_province = nullif(upper(trim(p_sender_province)), ''), sender_email = nullif(trim(p_sender_email), ''),
    pec_address = nullif(trim(p_pec_address), ''), pec_username = nullif(trim(p_pec_username), ''),
    pec_secret_id = v_secret, updated_at = now()
  where user_id = auth.uid();
end $$;
revoke all on function public.save_sending_settings(text, text, text, text, text, text, text, text, text) from public, anon;
grant execute on function public.save_sending_settings(text, text, text, text, text, text, text, text, text) to authenticated;

-- Solo per le edge function (service role): legge la password PEC dal Vault
create or replace function public.get_sending_secret(p_user uuid)
returns text language sql stable security definer set search_path = public, vault as $$
  select ds.decrypted_secret from admin_sending_settings s
  join vault.decrypted_secrets ds on ds.id = s.pec_secret_id
  where s.user_id = p_user
$$;
revoke all on function public.get_sending_secret(uuid) from public, anon, authenticated;

-- ---------- Archivio audio ----------
insert into storage.buckets (id, name, public, file_size_limit)
values ('assembly-audio', 'assembly-audio', false, 26214400)
on conflict (id) do nothing;

drop policy if exists "assembly audio: admin read" on storage.objects;
create policy "assembly audio: admin read" on storage.objects for select to authenticated
  using (bucket_id = 'assembly-audio' and public.is_condo_admin(((storage.foldername(name))[1])::uuid));
drop policy if exists "assembly audio: admin write" on storage.objects;
create policy "assembly audio: admin write" on storage.objects for insert to authenticated
  with check (bucket_id = 'assembly-audio' and public.is_condo_admin(((storage.foldername(name))[1])::uuid));
drop policy if exists "assembly audio: admin delete" on storage.objects;
create policy "assembly audio: admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'assembly-audio' and public.is_condo_admin(((storage.foldername(name))[1])::uuid));

-- ---------- Lavori periodici ----------
-- Ricevute PEC/raccomandata e trascrizioni in sospeso (edge function assembly-worker)
create or replace function public.run_assembly_worker()
returns bigint language plpgsql security definer set search_path = public, extensions as $$
declare t uuid;
begin
  if not exists (select 1 from condo_assembly_recipients where status in ('sending', 'sent', 'accepted') and sent_at > now() - interval '30 days')
     and not exists (select 1 from condo_assembly_recordings where status in ('uploaded', 'transcribing') and attempts < 5)
     and not exists (select 1 from condo_assembly_recordings r join condo_assembly_minutes m on m.assembly_id = r.assembly_id
                     where r.file_path is not null and m.finalized_at < now() - interval '30 days') then
    return null;
  end if;
  insert into cleanup_tokens default values returning token into t;
  return net.http_post(
    url := 'https://ragltuoxnduohyqigkcg.supabase.co/functions/v1/assembly-worker',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('token', t),
    timeout_milliseconds := 120000
  );
end $$;
revoke all on function public.run_assembly_worker() from public, anon, authenticated;

select cron.unschedule('assembly_worker') where exists (select 1 from cron.job where jobname = 'assembly_worker');
select cron.schedule('assembly_worker', '*/10 * * * *', $$select public.run_assembly_worker()$$);

-- GDPR: l'audio serve solo per scrivere il verbale. 30 giorni dopo il verbale
-- definitivo l'edge function assembly-worker cancella i file audio dallo storage
-- (resta la trascrizione). Lo storage non si pulisce via SQL.
