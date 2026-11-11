-- Area amministratore.
-- 1. Rate e preventivi: spesa ordinaria o straordinaria.
-- 2. Registro spese sostenute (bilancio), anche dalle uscite dell'estratto conto.
-- 3. Pratiche: una decisione approvata diventa una pratica, l'admin chiede i
--    preventivi ai fornitori (rubrica o Recofixer), li confronta e sceglie.
-- 4. Avviso "Prendi in carico" agli amministratori quando una decisione è approvata.
-- 5. Riepilogo multi-condominio per la home dell'amministratore.

-- ── 1. Ordinaria / straordinaria ──
alter table public.condo_charges add column if not exists kind text not null default 'ordinaria';
alter table public.condo_charges drop constraint if exists condo_charges_kind_check;
alter table public.condo_charges add constraint condo_charges_kind_check check (kind in ('ordinaria', 'straordinaria'));
alter table public.condo_budgets add column if not exists kind text not null default 'ordinaria';
alter table public.condo_budgets drop constraint if exists condo_budgets_kind_check;
alter table public.condo_budgets add constraint condo_budgets_kind_check check (kind in ('ordinaria', 'straordinaria'));

-- le rate emesse da un preventivo ereditano il tipo del preventivo
create or replace function public.condo_charges_kind_from_budget()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.budget_id is not null then
    select b.kind into new.kind from condo_budgets b where b.id = new.budget_id;
  end if;
  return new;
end $$;
revoke all on function public.condo_charges_kind_from_budget() from public, anon, authenticated;
drop trigger if exists condo_charges_kind_from_budget on public.condo_charges;
create trigger condo_charges_kind_from_budget before insert on public.condo_charges
  for each row execute function public.condo_charges_kind_from_budget();

drop function if exists public.add_charge(uuid, text, numeric, date, uuid, boolean);
create or replace function public.add_charge(p_building uuid, p_title text, p_amount numeric, p_due date,
  p_user uuid default null, p_split boolean default false, p_kind text default 'ordinaria')
returns int language plpgsql security definer set search_path = public as $$
declare n int := 0; r record;
begin
  if not is_condo_admin(p_building) then raise exception 'Non autorizzato' using errcode = '42501'; end if;
  if p_amount <= 0 then raise exception 'Importo non valido' using errcode = '22023'; end if;
  if p_kind not in ('ordinaria', 'straordinaria') then raise exception 'Tipo non valido' using errcode = '22023'; end if;
  if p_split then
    for r in select user_id, millesimi from condo_members
              where building_id = p_building and millesimi is not null and coalesce(tenure, 'owner') <> 'tenant' loop
      if round(p_amount * r.millesimi / 1000, 2) > 0 then
        insert into condo_charges (building_id, user_id, title, amount, due_date, kind)
        values (p_building, r.user_id, p_title, round(p_amount * r.millesimi / 1000, 2), p_due, p_kind);
        n := n + 1;
      end if;
    end loop;
  else
    if not exists (select 1 from condo_members where building_id = p_building and user_id = p_user) then
      raise exception 'Il condomino non fa parte del condominio' using errcode = '22023';
    end if;
    insert into condo_charges (building_id, user_id, title, amount, due_date, kind) values (p_building, p_user, p_title, p_amount, p_due, p_kind);
    n := 1;
  end if;
  return n;
end $$;
revoke all on function public.add_charge(uuid, text, numeric, date, uuid, boolean, text) from public, anon;
grant execute on function public.add_charge(uuid, text, numeric, date, uuid, boolean, text) to authenticated;

-- ── 3. Pratiche (prima delle spese, che possono riferirsi a una pratica) ──
create table if not exists public.condo_practices (
  id uuid primary key default gen_random_uuid(),
  ref_number bigint generated always as identity (start with 101),
  building_id uuid not null references public.buildings(id) on delete cascade,
  poll_id uuid unique references public.polls(id) on delete set null,
  title text not null check (char_length(title) between 3 and 160),
  description text check (description is null or char_length(description) <= 2000),
  category text not null default 'other' check (category in (
    'elevator', 'heating', 'electrical', 'plumbing', 'drains',
    'locksmith', 'antenna', 'building_works', 'other'
  )),
  kind text not null default 'straordinaria' check (kind in ('ordinaria', 'straordinaria')),
  status text not null default 'open' check (status in ('open', 'assigned', 'done', 'cancelled')),
  chosen_quote_id uuid,
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists condo_practices_building_idx on public.condo_practices(building_id, status, created_at desc);

create table if not exists public.condo_practice_quotes (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.condo_practices(id) on delete cascade,
  maintainer_id uuid references public.condo_maintainers(id) on delete set null,
  intervention_id uuid references public.condo_interventions(id) on delete set null,
  supplier_name text not null check (char_length(supplier_name) between 2 and 120),
  status text not null default 'requested' check (status in ('requested', 'received', 'chosen', 'rejected')),
  amount numeric(12,2) check (amount is null or amount > 0),
  days int check (days is null or days between 0 and 3650),
  warranty_months int check (warranty_months is null or warranty_months between 0 and 600),
  notes text check (notes is null or char_length(notes) <= 1000),
  requested_at timestamptz not null default now(),
  received_at timestamptz,
  created_by uuid not null default auth.uid() references public.profiles(id),
  check (status = 'requested' or status = 'rejected' or amount is not null)
);
create index if not exists condo_practice_quotes_practice_idx on public.condo_practice_quotes(practice_id);
create index if not exists condo_practice_quotes_intervention_idx on public.condo_practice_quotes(intervention_id);

alter table public.condo_practices drop constraint if exists condo_practices_chosen_fk;
alter table public.condo_practices add constraint condo_practices_chosen_fk
  foreign key (chosen_quote_id) references public.condo_practice_quotes(id) on delete set null;

alter table public.condo_practices enable row level security;
alter table public.condo_practice_quotes enable row level security;

-- la pratica la vedono i condomini (sanno a che punto è), la gestisce l'admin
drop policy if exists "practices: read" on public.condo_practices;
create policy "practices: read" on public.condo_practices for select to authenticated using (is_member(building_id));
drop policy if exists "practices: admin write" on public.condo_practices;
create policy "practices: admin write" on public.condo_practices for all to authenticated
  using (is_condo_admin(building_id)) with check (is_condo_admin(building_id) and created_by = auth.uid());

drop policy if exists "practice quotes: admin" on public.condo_practice_quotes;
create policy "practice quotes: admin" on public.condo_practice_quotes for all to authenticated
  using (exists (select 1 from condo_practices p where p.id = practice_id and is_condo_admin(p.building_id)))
  with check (exists (select 1 from condo_practices p where p.id = practice_id and is_condo_admin(p.building_id)));
drop policy if exists "practice quotes: supplier read" on public.condo_practice_quotes;
create policy "practice quotes: supplier read" on public.condo_practice_quotes for select to authenticated
  using (intervention_id is not null and is_intervention_supplier(intervention_id));

revoke all on public.condo_practices, public.condo_practice_quotes from anon;
grant select, insert, update, delete on public.condo_practices, public.condo_practice_quotes to authenticated;

create or replace function public.condo_practices_touch()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists condo_practices_touch on public.condo_practices;
create trigger condo_practices_touch before update on public.condo_practices
  for each row execute function public.condo_practices_touch();

-- ── 2. Spese sostenute ──
create table if not exists public.condo_expenses (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id) on delete cascade,
  spent_on date not null,
  category text not null default 'other' check (category in ('maintenance', 'services', 'utilities', 'insurance', 'admin', 'other')),
  kind text not null default 'ordinaria' check (kind in ('ordinaria', 'straordinaria')),
  description text not null check (char_length(description) between 2 and 200),
  supplier text check (supplier is null or char_length(supplier) <= 120),
  amount numeric(12,2) not null check (amount > 0),
  movement_id uuid unique references public.condo_bank_movements(id) on delete set null,
  practice_id uuid references public.condo_practices(id) on delete set null,
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists condo_expenses_building_idx on public.condo_expenses(building_id, spent_on desc);
alter table public.condo_expenses enable row level security;
drop policy if exists "expenses: read" on public.condo_expenses;
create policy "expenses: read" on public.condo_expenses for select to authenticated using (is_member(building_id));
drop policy if exists "expenses: admin write" on public.condo_expenses;
create policy "expenses: admin write" on public.condo_expenses for all to authenticated
  using (is_condo_admin(building_id)) with check (is_condo_admin(building_id));
revoke all on public.condo_expenses from anon;
grant select, insert, update, delete on public.condo_expenses to authenticated;

-- Import delle uscite dall'estratto conto come spese (senza doppioni)
create or replace function public.import_expenses(p_building uuid, p_rows jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r jsonb; mid uuid; saved int := 0; dup int := 0;
begin
  if not is_condo_admin(p_building) then raise exception 'Non autorizzato' using errcode = '42501'; end if;
  for r in select * from jsonb_array_elements(p_rows) loop
    insert into condo_bank_movements (building_id, booked_on, amount, description, payer, fingerprint)
    values (p_building, (r->>'date')::date, -abs((r->>'amount')::numeric), left(r->>'description', 500), left(r->>'payer', 160), r->>'fingerprint')
    on conflict (building_id, fingerprint) do nothing
    returning id into mid;
    if mid is null then dup := dup + 1; continue; end if;
    insert into condo_expenses (building_id, spent_on, category, kind, description, supplier, amount, movement_id)
    values (p_building, (r->>'date')::date,
            coalesce(nullif(r->>'category', ''), 'other'),
            coalesce(nullif(r->>'kind', ''), 'ordinaria'),
            left(coalesce(nullif(trim(r->>'description'), ''), 'Spesa da estratto conto'), 200),
            nullif(left(r->>'payer', 120), ''),
            abs((r->>'amount')::numeric), mid);
    saved := saved + 1;
    mid := null;
  end loop;
  return jsonb_build_object('saved', saved, 'duplicates', dup);
end $$;
revoke all on function public.import_expenses(uuid, jsonb) from public, anon;
grant execute on function public.import_expenses(uuid, jsonb) to authenticated;

-- ── 3b. Funzioni pratiche ──

-- decisione approvata in modo definitivo (senza fase 2, o fase 2 conclusa)
create or replace function public.poll_is_final(p polls)
returns boolean language sql immutable set search_path = public as $$
  select p.status = 'approved' and p.phase2_status in ('none', 'closed')
$$;

-- "Prendi in carico": crea (o riapre) la pratica della decisione
create or replace function public.take_charge_poll(p_poll uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v polls%rowtype; v_id uuid; v_title text; v_desc text;
begin
  select * into v from polls where id = p_poll;
  if not found or not is_condo_admin(v.building_id) then raise exception 'Non autorizzato' using errcode = '42501'; end if;
  if not poll_is_final(v) then raise exception 'La decisione non è ancora approvata' using errcode = '22023'; end if;
  select id into v_id from condo_practices where poll_id = p_poll;
  if v_id is not null then return v_id; end if;
  v_title := left(v.question, 160);
  if v.phase2_winner is not null then
    select 'Proposta scelta: ' || o.title || coalesce(E'\n' || o.description, '') into v_desc from poll_options o where o.id = v.phase2_winner;
  end if;
  insert into condo_practices (building_id, poll_id, title, description, created_by)
  values (v.building_id, p_poll, case when char_length(v_title) < 3 then 'Decisione approvata' else v_title end, v_desc, auth.uid())
  returning id into v_id;
  update notifications set read_at = now()
   where user_id = auth.uid() and kind = 'take_charge' and link like '%poll=' || p_poll::text and read_at is null;
  return v_id;
end $$;
revoke all on function public.take_charge_poll(uuid) from public, anon;
grant execute on function public.take_charge_poll(uuid) to authenticated;

-- Richiesta di preventivo a un fornitore della rubrica: apre un intervento
-- "richiesto" (se il fornitore è un Recofixer lo vede e può caricare il preventivo)
create or replace function public.request_practice_quote(p_practice uuid, p_maintainer uuid, p_message text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare pr condo_practices%rowtype; m condo_maintainers%rowtype; v_int uuid; v_id uuid;
begin
  select * into pr from condo_practices where id = p_practice;
  if not found or not is_condo_admin(pr.building_id) then raise exception 'Non autorizzato' using errcode = '42501'; end if;
  if pr.status <> 'open' then raise exception 'La pratica non accetta più preventivi' using errcode = '22023'; end if;
  select * into m from condo_maintainers where id = p_maintainer and building_id = pr.building_id;
  if not found then raise exception 'Fornitore non trovato in rubrica' using errcode = 'P0002'; end if;
  select id into v_id from condo_practice_quotes where practice_id = p_practice and maintainer_id = p_maintainer and status <> 'rejected';
  if v_id is not null then return v_id; end if;
  insert into condo_interventions (building_id, created_by, maintainer_id, title, category, description, status)
  values (pr.building_id, auth.uid(), p_maintainer, left('Preventivo: ' || pr.title, 140), pr.category,
          nullif(trim(concat_ws(E'\n\n', pr.description, p_message)), ''), 'requested')
  returning id into v_int;
  insert into condo_practice_quotes (practice_id, maintainer_id, intervention_id, supplier_name, created_by)
  values (p_practice, p_maintainer, v_int, left(coalesce(nullif(m.company, ''), m.name), 120), auth.uid())
  returning id into v_id;
  return v_id;
end $$;
revoke all on function public.request_practice_quote(uuid, uuid, text) from public, anon;
grant execute on function public.request_practice_quote(uuid, uuid, text) to authenticated;

-- Il preventivo caricato dal Recofixer sull'intervento arriva nella pratica
create or replace function public.intervention_quote_to_practice()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.kind = 'quote' and new.amount_cents is not null and new.amount_cents > 0 then
    update condo_practice_quotes
       set amount = new.amount_cents / 100.0, status = 'received', received_at = now()
     where intervention_id = new.intervention_id and status in ('requested', 'received');
  end if;
  return new;
end $$;
revoke all on function public.intervention_quote_to_practice() from public, anon, authenticated;
drop trigger if exists intervention_quote_to_practice on public.condo_intervention_files;
create trigger intervention_quote_to_practice after insert on public.condo_intervention_files
  for each row execute function public.intervention_quote_to_practice();

-- Scegli il preventivo: gli altri sono respinti, le loro richieste annullate
create or replace function public.choose_practice_quote(p_quote uuid)
returns void language plpgsql security definer set search_path = public as $$
declare q condo_practice_quotes%rowtype; pr condo_practices%rowtype; v_int uuid;
begin
  select * into q from condo_practice_quotes where id = p_quote;
  if not found then raise exception 'Preventivo non trovato' using errcode = 'P0002'; end if;
  select * into pr from condo_practices where id = q.practice_id for update;
  if not is_condo_admin(pr.building_id) then raise exception 'Non autorizzato' using errcode = '42501'; end if;
  if pr.status <> 'open' then raise exception 'Pratica già affidata' using errcode = '22023'; end if;
  if q.amount is null then raise exception 'Il preventivo non ha ancora un importo' using errcode = '22023'; end if;

  update condo_practice_quotes set status = 'rejected' where practice_id = pr.id and id <> p_quote and status in ('requested', 'received');
  update condo_interventions i set status = 'cancelled'
    from condo_practice_quotes x
   where x.practice_id = pr.id and x.id <> p_quote and x.intervention_id = i.id and i.status = 'requested';
  update condo_practice_quotes set status = 'chosen', received_at = coalesce(received_at, now()) where id = p_quote;

  v_int := q.intervention_id;
  if v_int is null and q.maintainer_id is not null then
    insert into condo_interventions (building_id, created_by, maintainer_id, title, category, description, status)
    values (pr.building_id, auth.uid(), q.maintainer_id, left(pr.title, 140), pr.category, pr.description, 'requested')
    returning id into v_int;
    update condo_practice_quotes set intervention_id = v_int where id = p_quote;
  elsif v_int is not null then
    update condo_interventions set title = left(pr.title, 140) where id = v_int and status = 'requested';
  end if;
  update condo_practices set status = 'assigned', chosen_quote_id = p_quote where id = pr.id;
end $$;
revoke all on function public.choose_practice_quote(uuid) from public, anon;
grant execute on function public.choose_practice_quote(uuid) to authenticated;

-- ── 4. Avviso "Prendi in carico" agli amministratori ──
create or replace function public.polls_notify_admins()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_link text;
begin
  if poll_is_final(new) and not poll_is_final(old) then
    v_link := '/edificio/' || new.building_id || '/condominio/pratiche?poll=' || new.id;
    insert into notifications (user_id, building_id, kind, title, body, link)
    select m.user_id, new.building_id, 'take_charge', 'Decisione approvata: prendi in carico', left(new.question, 300), v_link
      from condo_members m
     where m.building_id = new.building_id and m.role = 'admin'
       and not exists (select 1 from notifications n where n.user_id = m.user_id and n.link = v_link);
  end if;
  return new;
end $$;
revoke all on function public.polls_notify_admins() from public, anon, authenticated;
drop trigger if exists polls_notify_admins on public.polls;
create trigger polls_notify_admins after update of status, phase2_status on public.polls
  for each row execute function public.polls_notify_admins();

-- ── 5. Riepilogo per la home dell'amministratore ──
create or replace function public.admin_buildings_overview()
returns table (
  building_id uuid, address text, street_number text, city text, neighborhood text, photo_url text,
  members int, owners int,
  due_total numeric, paid_total numeric, overdue_total numeric, overdue_people int,
  receipts_pending int, transfers_pending int, events_pending int,
  polls_to_take int, practices_open int, quotes_received int
)
language sql stable security definer set search_path = public as $$
  select b.id, b.address, b.street_number, b.city, b.neighborhood, b.photo_url,
    (select count(*)::int from condo_members m where m.building_id = b.id and m.role <> 'admin'),
    (select count(*)::int from condo_members m where m.building_id = b.id and m.millesimi is not null),
    (select coalesce(sum(c.amount), 0) from condo_charges c where c.building_id = b.id and c.status <> 'cancelled'),
    (select coalesce(sum(c.amount), 0) from condo_charges c where c.building_id = b.id and c.status = 'paid'),
    (select coalesce(sum(c.amount), 0) from condo_charges c where c.building_id = b.id and c.status in ('open', 'pending') and c.due_date < current_date),
    (select count(distinct c.user_id)::int from condo_charges c where c.building_id = b.id and c.status in ('open', 'pending') and c.due_date < current_date),
    (select count(*)::int from condo_payment_receipts r where r.building_id = b.id and r.status = 'pending'),
    (select count(*)::int from condo_charges c where c.building_id = b.id and c.status = 'pending'
        and not exists (select 1 from condo_payment_receipts r where r.status = 'pending' and c.id = any(r.charge_ids))),
    (select count(*)::int from events e where e.building_id = b.id and not e.approved and e.event_date >= current_date),
    (select count(*)::int from polls p where p.building_id = b.id and poll_is_final(p)
        and not exists (select 1 from condo_practices x where x.poll_id = p.id)),
    (select count(*)::int from condo_practices x where x.building_id = b.id and x.status in ('open', 'assigned')),
    (select count(*)::int from condo_practice_quotes q join condo_practices x on x.id = q.practice_id
        where x.building_id = b.id and x.status = 'open' and q.status = 'received')
  from condo_members me join buildings b on b.id = me.building_id
  where me.user_id = auth.uid() and me.role = 'admin'
  order by b.address
$$;
revoke all on function public.admin_buildings_overview() from public, anon;
grant execute on function public.admin_buildings_overview() to authenticated;

-- Situazione per condomino (rendicontazione admin, PDF bilancio provvisorio)
create or replace function public.admin_member_balances(p_building uuid)
returns table (
  user_id uuid, display_name text, floor text, millesimi numeric, tenure text,
  ord_total numeric, straord_total numeric, paid numeric, open_amount numeric, overdue numeric,
  pending int, last_paid_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select m.user_id, p.display_name, m.floor, m.millesimi, m.tenure,
    coalesce(sum(c.amount) filter (where c.kind = 'ordinaria' and c.status <> 'cancelled'), 0),
    coalesce(sum(c.amount) filter (where c.kind = 'straordinaria' and c.status <> 'cancelled'), 0),
    coalesce(sum(c.amount) filter (where c.status = 'paid'), 0),
    coalesce(sum(c.amount) filter (where c.status in ('open', 'pending')), 0),
    coalesce(sum(c.amount) filter (where c.status in ('open', 'pending') and c.due_date < current_date), 0),
    (count(*) filter (where c.status = 'pending'))::int,
    max(c.paid_at)
  from condo_members m
  join profiles p on p.id = m.user_id
  left join condo_charges c on c.building_id = m.building_id and c.user_id = m.user_id
  where m.building_id = p_building and m.role <> 'admin' and is_condo_admin(p_building)
  group by m.user_id, p.display_name, m.floor, m.millesimi, m.tenure
  order by p.display_name
$$;
revoke all on function public.admin_member_balances(uuid) from public, anon;
grant execute on function public.admin_member_balances(uuid) to authenticated;
