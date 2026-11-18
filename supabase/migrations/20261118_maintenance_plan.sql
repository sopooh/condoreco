-- Manutenzione programmata ed emergenze.
-- 1) Calendario delle manutenzioni obbligatorie: per ogni condominio le
--    scadenze di legge entrano come "fermaposto" (status placeholder) visibili
--    solo all'amministratore. Quando le approva con data e fornitore diventano
--    un evento del calendario per tutti; a lavoro fatto si crea il fermaposto
--    della scadenza successiva. Promemoria giornalieri all'amministratore.
-- 2) Smistamento delle segnalazioni (condo_tickets) per urgenza: regole
--    immediate all'inserimento (emergenze avvisano subito l'amministratore),
--    poi Condor puo' rifinire urgenza e fornitore (edge function maintenance-ai).

-- ---------- Catalogo degli obblighi ----------
create or replace function public.maintenance_catalog()
returns table(kind text, title text, legal_basis text, frequency_months int, trade text, keywords text, note text)
language sql
immutable
set search_path = public
as $$
  values
  ('lift_maintenance', 'Manutenzione ordinaria ascensore', 'DPR 162/1999, art. 15', 6, 'elevator', 'ascensor|elevator', 'Visita del manutentore abilitato almeno ogni 6 mesi.'),
  ('lift_inspection', 'Verifica periodica ascensore', 'DPR 162/1999, art. 13', 24, 'elevator', 'ascensor|elevator|verific', 'Verifica biennale di un organismo notificato o di ASL/ARPA, richiesta dal proprietario.'),
  ('heating_maintenance', 'Manutenzione impianto termico centralizzato', 'DPR 74/2013, art. 7 e libretto di impianto', 12, 'heating', 'caldai|termic|riscald|calore', 'Frequenza indicata dall''installatore o dal manutentore nel libretto; di solito annuale.'),
  ('heating_efficiency', 'Controllo di efficienza energetica', 'DPR 74/2013, art. 8 e Allegato A', 24, 'heating', 'caldai|termic|riscald|calore', 'Ogni 2 anni per impianti a gas oltre 100 kW; la frequenza cambia con potenza, combustibile e norme regionali.'),
  ('extinguishers', 'Controllo periodico estintori', 'DM 1 settembre 2021 e UNI 9994-1', 6, 'other', 'antincend|estint|fire', 'Controllo semestrale da tecnico qualificato, registrato sul cartellino e sul registro antincendio.'),
  ('fire_hydrants', 'Controllo rete idranti e naspi', 'DM 1 settembre 2021 e UNI 10779', 6, 'other', 'antincend|idrant|naspi|fire', 'Solo se il condominio ha una rete idranti.'),
  ('fire_doors', 'Controllo porte tagliafuoco e uscite di sicurezza', 'DM 1 settembre 2021', 6, 'other', 'antincend|porte|tagliafuoco|fire', 'Solo se ci sono porte tagliafuoco (autorimesse, vani scala protetti).'),
  ('fire_cpi', 'Rinnovo periodico di conformita'' antincendio (CPI)', 'DPR 151/2011, art. 5', 60, 'other', 'antincend|cpi|vigili|fire', 'Edifici con altezza antincendio oltre 24 m o autorimesse oltre 300 m².'),
  ('earthing', 'Verifica impianto di messa a terra', 'DPR 462/2001', 60, 'electrical', 'elettric|messa a terra', 'Obbligatoria se il condominio ha dipendenti (es. portiere); ogni 5 anni, ogni 2 in ambienti a rischio.')
$$;

-- ---------- Scadenze del condominio ----------
create table if not exists public.condo_maintenance_items (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id) on delete cascade,
  kind text not null,
  title text not null check (char_length(title) between 3 and 160),
  legal_basis text,
  frequency_months int not null check (frequency_months between 1 and 120),
  status text not null default 'placeholder' check (status in ('placeholder', 'scheduled', 'done', 'dismissed')),
  next_due date not null,
  last_done date,
  last_done_known boolean not null default false,
  scheduled_date date,
  time_start time,
  time_end time,
  maintainer_id uuid references public.condo_maintainers(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  notes text check (notes is null or char_length(notes) <= 1000),
  done_at date,
  reminded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists condo_maintenance_items_active_kind
  on public.condo_maintenance_items (building_id, kind) where status in ('placeholder', 'scheduled');
create index if not exists condo_maintenance_items_due on public.condo_maintenance_items (status, next_due);
alter table public.condo_maintenance_items enable row level security;
revoke all on public.condo_maintenance_items from anon, authenticated;
grant select on public.condo_maintenance_items to authenticated;
drop policy if exists "maintenance: admin read" on public.condo_maintenance_items;
create policy "maintenance: admin read" on public.condo_maintenance_items for select to authenticated
  using (public.is_condo_admin(building_id));

-- Fornitore piu' adatto: stessa categoria o parole chiave nel nome, nelle note
-- o nei contratti; prima chi ha un contratto attivo.
create or replace function public.suggest_maintainer(p_building uuid, p_trade text, p_keywords text default null)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select m.id
    from condo_maintainers m
   where m.building_id = p_building
     and ((p_trade is not null and p_trade <> 'other' and m.category = p_trade)
          or (p_keywords is not null and (
                lower(concat_ws(' ', m.name, m.company, m.notes)) ~ p_keywords
             or exists (select 1 from condo_supplier_contracts c
                         where c.maintainer_id = m.id and lower(concat_ws(' ', c.title, c.service_category)) ~ p_keywords))))
   order by exists (select 1 from condo_supplier_contracts c
                     where c.maintainer_id = m.id and c.status = 'active'
                       and (c.end_date is null or c.end_date >= current_date)) desc,
            (m.category = p_trade) desc,
            m.created_at
   limit 1
$$;
revoke all on function public.suggest_maintainer(uuid, text, text) from public, anon, authenticated;

-- Crea i fermaposto mancanti (una volta per tipo: quelli scartati non tornano)
create or replace function public.ensure_maintenance_plan(p_building uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare n int;
begin
  if not public.is_condo_admin(p_building) then raise exception 'not allowed' using errcode = '42501'; end if;
  insert into condo_maintenance_items (building_id, kind, title, legal_basis, frequency_months, next_due, maintainer_id)
  select p_building, c.kind, c.title, c.legal_basis, c.frequency_months, current_date + 30,
         public.suggest_maintainer(p_building, c.trade, c.keywords)
    from public.maintenance_catalog() c
   where not exists (select 1 from condo_maintenance_items i where i.building_id = p_building and i.kind = c.kind);
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.ensure_maintenance_plan(uuid) from public, anon;
grant execute on function public.ensure_maintenance_plan(uuid) to authenticated;

-- Elenco per l'amministratore
create or replace function public.maintenance_items(p_building uuid)
returns table(id uuid, kind text, title text, legal_basis text, note text, frequency_months int, status text,
              next_due date, last_done date, last_done_known boolean, scheduled_date date, time_start time, time_end time,
              maintainer_id uuid, maintainer_name text, maintainer_phone text, suggested_maintainer_id uuid,
              suggested_maintainer_name text, event_id uuid, done_at date, notes text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_condo_admin(p_building) then raise exception 'not allowed' using errcode = '42501'; end if;
  return query
  select i.id, i.kind, i.title, i.legal_basis, c.note, i.frequency_months, i.status,
         i.next_due, i.last_done, i.last_done_known, i.scheduled_date, i.time_start, i.time_end,
         i.maintainer_id, coalesce(m.company, m.name), m.phone,
         s.sid, coalesce(sm.company, sm.name), i.event_id, i.done_at, i.notes
    from condo_maintenance_items i
    left join public.maintenance_catalog() c on c.kind = i.kind
    left join condo_maintainers m on m.id = i.maintainer_id
    left join lateral (select public.suggest_maintainer(i.building_id, c.trade, c.keywords) as sid) s on true
    left join condo_maintainers sm on sm.id = s.sid
   where i.building_id = p_building
   order by case i.status when 'scheduled' then 0 when 'placeholder' then 1 when 'done' then 2 else 3 end,
            coalesce(i.scheduled_date, i.next_due), i.title;
end $$;
revoke all on function public.maintenance_items(uuid) from public, anon;
grant execute on function public.maintenance_items(uuid) to authenticated;

-- Fermaposto per il calendario (solo admin). Le scadenze gia' passate si
-- mostrano oggi, cosi' non spariscono dal mese corrente.
create or replace function public.maintenance_placeholders(p_building uuid, p_from date, p_to date)
returns table(id uuid, title text, legal_basis text, due date, overdue boolean)
language sql
stable
security definer
set search_path = public
as $$
  select i.id, i.title, i.legal_basis, greatest(i.next_due, current_date), i.next_due < current_date
    from condo_maintenance_items i
   where i.building_id = p_building and i.status = 'placeholder'
     and public.is_condo_admin(p_building)
     and greatest(i.next_due, current_date) between p_from and p_to
$$;
revoke all on function public.maintenance_placeholders(uuid, date, date) from public, anon;
grant execute on function public.maintenance_placeholders(uuid, date, date) to authenticated;

-- Ultima volta fatta: ricalcola la prossima scadenza
create or replace function public.set_maintenance_last_done(p_item uuid, p_last_done date)
returns date
language plpgsql
security definer
set search_path = public
as $$
declare i condo_maintenance_items; v_next date;
begin
  select * into i from condo_maintenance_items where id = p_item for update;
  if not found or not public.is_condo_admin(i.building_id) then raise exception 'not allowed' using errcode = '42501'; end if;
  if i.status <> 'placeholder' then raise exception 'not a placeholder' using errcode = '22023'; end if;
  if p_last_done is null or p_last_done > current_date then raise exception 'invalid date' using errcode = '22023'; end if;
  v_next := (p_last_done + make_interval(months => i.frequency_months))::date;
  update condo_maintenance_items
     set last_done = p_last_done, last_done_known = true, next_due = v_next, reminded_at = null, updated_at = now()
   where id = p_item;
  return v_next;
end $$;
revoke all on function public.set_maintenance_last_done(uuid, date) from public, anon;
grant execute on function public.set_maintenance_last_done(uuid, date) to authenticated;

-- Approva e programma per tutti: evento in calendario + avviso ai condomini
create or replace function public.schedule_maintenance(p_item uuid, p_date date, p_time_start time default null,
                                                       p_time_end time default null, p_maintainer uuid default null,
                                                       p_notes text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  i condo_maintenance_items;
  v_event uuid;
  v_sup text;
  v_desc text;
begin
  select * into i from condo_maintenance_items where id = p_item for update;
  if not found or not public.is_condo_admin(i.building_id) then raise exception 'not allowed' using errcode = '42501'; end if;
  if i.status not in ('placeholder', 'scheduled') then raise exception 'not schedulable' using errcode = '22023'; end if;
  if p_date is null or p_date < current_date then raise exception 'invalid date' using errcode = '22023'; end if;
  if p_time_start is not null and p_time_end is not null and p_time_end <= p_time_start then
    raise exception 'invalid time' using errcode = '22023';
  end if;
  if p_maintainer is not null and not exists (select 1 from condo_maintainers m where m.id = p_maintainer and m.building_id = i.building_id) then
    raise exception 'maintainer not in building' using errcode = '23514';
  end if;
  select coalesce(m.company, m.name) into v_sup from condo_maintainers m where m.id = p_maintainer;
  v_desc := concat_ws(E'\n',
    'Manutenzione obbligatoria (' || coalesce(i.legal_basis, 'obbligo di legge') || ').',
    case when v_sup is not null then 'Ditta: ' || v_sup || '.' end,
    nullif(trim(p_notes), ''));

  if i.event_id is not null and exists (select 1 from events e where e.id = i.event_id) then
    update events set title = i.title, event_date = p_date, time_start = p_time_start, time_end = p_time_end,
                      description = v_desc, approved = true
     where id = i.event_id;
    v_event := i.event_id;
  else
    insert into events (building_id, created_by, title, event_date, time_start, time_end, event_type, approved, description)
    values (i.building_id, auth.uid(), left(i.title, 200), p_date, p_time_start, p_time_end, 'maintenance', true, v_desc)
    returning id into v_event;
  end if;

  update condo_maintenance_items
     set status = 'scheduled', scheduled_date = p_date, time_start = p_time_start, time_end = p_time_end,
         maintainer_id = coalesce(p_maintainer, maintainer_id), event_id = v_event,
         notes = coalesce(nullif(trim(p_notes), ''), notes), reminded_at = null, updated_at = now()
   where id = p_item;

  insert into notifications (user_id, building_id, kind, title, body, link)
  select m.user_id, i.building_id, 'maintenance', 'Manutenzione programmata',
         i.title || ' il ' || to_char(p_date, 'DD/MM/YYYY')
           || case when p_time_start is not null then ' alle ' || to_char(p_time_start, 'HH24:MI') else '' end || '.',
         '/edificio/' || i.building_id || '/condominio/calendario'
    from condo_members m
   where m.building_id = i.building_id and m.user_id <> auth.uid();
  return v_event;
end $$;
revoke all on function public.schedule_maintenance(uuid, date, time, time, uuid, text) from public, anon;
grant execute on function public.schedule_maintenance(uuid, date, time, time, uuid, text) to authenticated;

-- Fatta: chiude la scadenza e mette il fermaposto della successiva
create or replace function public.complete_maintenance(p_item uuid, p_done date default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare i condo_maintenance_items; v_done date := coalesce(p_done, current_date); v_new uuid;
begin
  select * into i from condo_maintenance_items where id = p_item for update;
  if not found or not public.is_condo_admin(i.building_id) then raise exception 'not allowed' using errcode = '42501'; end if;
  if i.status not in ('placeholder', 'scheduled') then raise exception 'already closed' using errcode = '22023'; end if;
  if v_done > current_date then raise exception 'invalid date' using errcode = '22023'; end if;
  update condo_maintenance_items set status = 'done', done_at = v_done, last_done = v_done, last_done_known = true, updated_at = now()
   where id = p_item;
  insert into condo_maintenance_items (building_id, kind, title, legal_basis, frequency_months, next_due, last_done, last_done_known, maintainer_id)
  values (i.building_id, i.kind, i.title, i.legal_basis, i.frequency_months,
          (v_done + make_interval(months => i.frequency_months))::date, v_done, true, i.maintainer_id)
  returning id into v_new;
  return v_new;
end $$;
revoke all on function public.complete_maintenance(uuid, date) from public, anon;
grant execute on function public.complete_maintenance(uuid, date) to authenticated;

-- Non presente in questo condominio (o ripristino)
create or replace function public.dismiss_maintenance(p_item uuid, p_dismiss boolean default true)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare i condo_maintenance_items;
begin
  select * into i from condo_maintenance_items where id = p_item for update;
  if not found or not public.is_condo_admin(i.building_id) then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_dismiss then
    if i.status = 'scheduled' and i.event_id is not null then delete from events where id = i.event_id; end if;
    update condo_maintenance_items set status = 'dismissed', event_id = null, updated_at = now() where id = p_item;
  else
    if i.status <> 'dismissed' then return; end if;
    update condo_maintenance_items set status = 'placeholder', next_due = greatest(next_due, current_date + 30), updated_at = now() where id = p_item;
  end if;
end $$;
revoke all on function public.dismiss_maintenance(uuid, boolean) from public, anon;
grant execute on function public.dismiss_maintenance(uuid, boolean) to authenticated;

-- Promemoria giornalieri all'amministratore (al massimo uno a settimana per scadenza)
create or replace function public.run_maintenance_reminders()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare n int := 0; r record;
begin
  for r in
    select i.*, (i.status = 'scheduled') as to_confirm
      from condo_maintenance_items i
     where (i.reminded_at is null or i.reminded_at < now() - interval '7 days')
       and ((i.status = 'placeholder' and i.next_due <= current_date + 30)
            or (i.status = 'scheduled' and i.scheduled_date < current_date))
  loop
    insert into notifications (user_id, building_id, kind, title, body, link)
    select m.user_id, r.building_id, 'maintenance',
           case when r.to_confirm then 'Manutenzione da confermare'
                when r.next_due < current_date then 'Scadenza di legge superata'
                else 'Scadenza di legge in arrivo' end,
           case when r.to_confirm then r.title || ' era in programma il ' || to_char(r.scheduled_date, 'DD/MM/YYYY') || ': segnala che è stata fatta o riprogrammala.'
                else r.title || ' entro il ' || to_char(r.next_due, 'DD/MM/YYYY') || '. Approvala per programmarla per tutti.' end,
           '/edificio/' || r.building_id || '/condominio/manutenzioni'
      from condo_members m
     where m.building_id = r.building_id and m.role = 'admin';
    update condo_maintenance_items set reminded_at = now() where id = r.id;
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.run_maintenance_reminders() from public, anon, authenticated;
select cron.unschedule('maintenance_reminders') where exists (select 1 from cron.job where jobname = 'maintenance_reminders');
select cron.schedule('maintenance_reminders', '17 7 * * *', $$select public.run_maintenance_reminders()$$);

-- ---------- Smistamento delle segnalazioni ----------
alter table public.condo_tickets
  add column if not exists urgency text check (urgency is null or urgency in ('emergency', 'high', 'normal', 'low')),
  add column if not exists urgency_reason text check (urgency_reason is null or char_length(urgency_reason) <= 300),
  add column if not exists trade text check (trade is null or trade in ('elevator', 'heating', 'electrical', 'plumbing', 'drains', 'locksmith', 'antenna', 'building_works', 'other')),
  add column if not exists suggested_maintainer_id uuid references public.condo_maintainers(id) on delete set null,
  add column if not exists triaged_by text check (triaged_by is null or triaged_by in ('rules', 'ai', 'admin')),
  add column if not exists triaged_at timestamptz;

create or replace function public.ticket_rules_triage()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare t text := lower(coalesce(new.title, '') || ' ' || coalesce(new.description, ''));
begin
  -- i residenti possono modificare il proprio ticket ma non l'urgenza
  if tg_op = 'UPDATE' and auth.uid() is not null and not public.is_condo_admin(new.building_id) then
    new.urgency := old.urgency; new.urgency_reason := old.urgency_reason; new.trade := old.trade;
    new.suggested_maintainer_id := old.suggested_maintainer_id; new.triaged_by := old.triaged_by; new.triaged_at := old.triaged_at;
    return new;
  end if;
  if tg_op = 'UPDATE' and new.triaged_by is not null then return new; end if;
  if t ~ '(odore di gas|puzza di gas|fuga di gas|perdita di gas|fumo|incendi|fiamm|allag|intrappolat|bloccat[oaie]? (in|nell)|crollo|crollat|cediment|ceduto|scintill|cortocircuit|fili scoperti|scossa)' then
    new.urgency := 'emergency'; new.urgency_reason := 'Possibile pericolo per persone o edificio.';
  elsif new.category in ('elevator', 'security', 'infiltration')
     or t ~ '(ascensore (fermo|guasto|bloccato|non funziona)|senza acqua|manca l.acqua|niente acqua|senza riscaldamento|riscaldamento (spento|non funziona)|termosifoni freddi|perdita|infiltraz|portone (rotto|non chiude)|cancello (rotto|bloccato)|blackout|senza luce|luce (scale|androne))' then
    new.urgency := 'high'; new.urgency_reason := 'Disservizio che riguarda tutti o rischio di danni.';
  elsif new.category in ('noise', 'admin', 'waste') then
    new.urgency := 'low'; new.urgency_reason := 'Non richiede un intervento tecnico immediato.';
  else
    new.urgency := 'normal'; new.urgency_reason := null;
  end if;
  new.trade := case
    when new.category = 'elevator' or t ~ 'ascensor' then 'elevator'
    when new.category = 'heating' or t ~ '(caldai|riscald|termosif|calorifer)' then 'heating'
    when t ~ '(scarico|scarichi|fogna|tombin|intasat|ingorg)' then 'drains'
    when new.category = 'infiltration' or t ~ '(acqua|tubo|tubatur|perdita|rubinett|infiltraz)' then 'plumbing'
    when t ~ '(luce|luci|lampad|corrente|elettric|interruttor|citofon)' then 'electrical'
    when new.category = 'security' or t ~ '(serratur|chiav|portone|cancello)' then 'locksmith'
    when t ~ '(antenna|parabola|segnale tv)' then 'antenna'
    when new.category in ('common_areas', 'maintenance') or t ~ '(intonaco|crep|facciata|tetto|muro|pavimento)' then 'building_works'
    else 'other' end;
  new.suggested_maintainer_id := public.suggest_maintainer(new.building_id, new.trade, null);
  new.triaged_by := 'rules';
  new.triaged_at := now();
  return new;
end $$;
revoke all on function public.ticket_rules_triage() from public, anon, authenticated;
drop trigger if exists condo_tickets_triage on public.condo_tickets;
create trigger condo_tickets_triage before insert or update on public.condo_tickets
  for each row execute function public.ticket_rules_triage();

-- Emergenza: avviso immediato agli amministratori
create or replace function public.ticket_emergency_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.urgency = 'emergency' then
    insert into notifications (user_id, building_id, kind, title, body, link)
    select m.user_id, new.building_id, 'ticket_emergency', 'Segnalazione urgente',
           left(new.title, 140) || ' (possibile emergenza)', '/edificio/' || new.building_id || '/condominio/manutenzioni?tab=segnalazioni'
      from condo_members m
     where m.building_id = new.building_id and m.role = 'admin' and m.user_id <> new.created_by;
  end if;
  return new;
end $$;
revoke all on function public.ticket_emergency_notify() from public, anon, authenticated;
drop trigger if exists condo_tickets_emergency on public.condo_tickets;
create trigger condo_tickets_emergency after insert on public.condo_tickets
  for each row execute function public.ticket_emergency_notify();

-- segnalazioni gia' aperte: smistate con le stesse regole (il trigger
-- ricalcola sugli UPDATE solo se triaged_by e' vuoto)
update condo_tickets set triaged_at = null where status = 'open' and triaged_by is null;

-- Elenco per l'amministratore, dalla piu' urgente
create or replace function public.tickets_triage(p_building uuid)
returns table(id uuid, title text, description text, category text, created_at timestamptz, author text,
              urgency text, urgency_reason text, trade text, triaged_by text,
              suggested_maintainer_id uuid, suggested_maintainer_name text, suggested_maintainer_phone text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_condo_admin(p_building) then raise exception 'not allowed' using errcode = '42501'; end if;
  return query
  select t.id, t.title, t.description, t.category, t.created_at,
         p.display_name::text,
         t.urgency, t.urgency_reason, t.trade, t.triaged_by,
         t.suggested_maintainer_id, coalesce(m.company, m.name), m.phone
    from condo_tickets t
    left join profiles p on p.id = t.created_by
    left join condo_maintainers m on m.id = t.suggested_maintainer_id
   where t.building_id = p_building and t.status = 'open'
   order by case t.urgency when 'emergency' then 0 when 'high' then 1 when 'normal' then 2 when 'low' then 3 else 2 end,
            t.created_at desc;
end $$;
revoke all on function public.tickets_triage(uuid) from public, anon;
grant execute on function public.tickets_triage(uuid) to authenticated;

-- Correzione manuale dell'amministratore
create or replace function public.set_ticket_triage(p_ticket uuid, p_urgency text, p_maintainer uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare t condo_tickets;
begin
  select * into t from condo_tickets where id = p_ticket;
  if not found or not public.is_condo_admin(t.building_id) then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_urgency not in ('emergency', 'high', 'normal', 'low') then raise exception 'invalid urgency' using errcode = '22023'; end if;
  if p_maintainer is not null and not exists (select 1 from condo_maintainers m where m.id = p_maintainer and m.building_id = t.building_id) then
    raise exception 'maintainer not in building' using errcode = '23514';
  end if;
  update condo_tickets
     set urgency = p_urgency, suggested_maintainer_id = coalesce(p_maintainer, suggested_maintainer_id),
         triaged_by = 'admin', triaged_at = now(),
         urgency_reason = case when urgency is distinct from p_urgency then 'Impostata dall''amministratore.' else urgency_reason end
   where id = p_ticket;
end $$;
revoke all on function public.set_ticket_triage(uuid, text, uuid) from public, anon;
grant execute on function public.set_ticket_triage(uuid, text, uuid) to authenticated;
