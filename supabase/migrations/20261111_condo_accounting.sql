-- Contabilità del condominio.
-- Preventivo annuo per voci → ripartito in millesimi (millesimi/1000) sui proprietari
-- iscritti → rate (condo_charges). L'amministratore segna i pagamenti: a mano,
-- confermando i bonifici dichiarati dai condomini, o importando l'estratto conto.
-- I pagamenti online (carta, PayPal via Stripe) sono segnati dal webhook.
--
-- Stato rata: open (da pagare) | pending (il condomino dice di aver fatto il bonifico)
--             | paid | cancelled

create table if not exists public.condo_accounting_settings (
  building_id uuid primary key references public.buildings(id) on delete cascade,
  iban text check (iban is null or iban ~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$'),
  holder text check (holder is null or char_length(holder) <= 120),
  bank_name text check (bank_name is null or char_length(bank_name) <= 80),
  stripe_account_id text,
  stripe_ready boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.condo_budgets (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id) on delete cascade,
  year int not null check (year between 2000 and 2100),
  title text not null default 'Preventivo ordinario' check (char_length(title) between 3 and 120),
  installments int not null default 12 check (installments in (1, 2, 3, 4, 6, 12)),
  first_due date not null,
  status text not null default 'draft' check (status in ('draft', 'issued')),
  issued_at timestamptz,
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (building_id, year, title)
);

create table if not exists public.condo_budget_items (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references public.condo_budgets(id) on delete cascade,
  category text not null check (category in ('maintenance', 'services', 'utilities', 'insurance', 'admin', 'other')),
  label text not null check (char_length(label) between 2 and 120),
  amount numeric(12,2) not null check (amount >= 0),
  position int not null default 0
);

create table if not exists public.condo_charges (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  budget_id uuid references public.condo_budgets(id) on delete set null,
  code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  title text not null check (char_length(title) between 2 and 160),
  amount numeric(12,2) not null check (amount > 0),
  due_date date not null,
  status text not null default 'open' check (status in ('open', 'pending', 'paid', 'cancelled')),
  reported_at timestamptz,
  paid_at timestamptz,
  paid_amount numeric(12,2),
  payment_method text check (payment_method in ('bonifico', 'carta', 'paypal', 'contanti', 'altro')),
  payment_ref text,
  confirmed_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists condo_charges_building_idx on public.condo_charges(building_id, status, due_date);
create index if not exists condo_charges_user_idx on public.condo_charges(user_id, due_date);

-- Movimenti importati dall'estratto conto (per non usarli due volte)
create table if not exists public.condo_bank_movements (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id) on delete cascade,
  booked_on date not null,
  amount numeric(12,2) not null,
  description text,
  payer text,
  fingerprint text not null,
  charge_id uuid references public.condo_charges(id) on delete set null,
  imported_by uuid not null default auth.uid() references public.profiles(id),
  imported_at timestamptz not null default now(),
  unique (building_id, fingerprint)
);

-- ── Permessi ──
alter table public.condo_accounting_settings enable row level security;
alter table public.condo_budgets enable row level security;
alter table public.condo_budget_items enable row level security;
alter table public.condo_charges enable row level security;
alter table public.condo_bank_movements enable row level security;

-- impostazioni: le vede chi è del condominio (serve l'IBAN per pagare), le cambia l'admin
drop policy if exists "acc settings: read" on public.condo_accounting_settings;
create policy "acc settings: read" on public.condo_accounting_settings for select to authenticated using (is_member(building_id));
drop policy if exists "acc settings: admin write" on public.condo_accounting_settings;
create policy "acc settings: admin write" on public.condo_accounting_settings for all to authenticated
  using (is_condo_admin(building_id)) with check (is_condo_admin(building_id));

-- preventivo: lo vedono tutti i condomini (rendicontazione), lo gestisce l'admin
drop policy if exists "budgets: read" on public.condo_budgets;
create policy "budgets: read" on public.condo_budgets for select to authenticated using (is_member(building_id));
drop policy if exists "budgets: admin write" on public.condo_budgets;
create policy "budgets: admin write" on public.condo_budgets for all to authenticated
  using (is_condo_admin(building_id)) with check (is_condo_admin(building_id));
drop policy if exists "budget items: read" on public.condo_budget_items;
create policy "budget items: read" on public.condo_budget_items for select to authenticated
  using (exists (select 1 from condo_budgets b where b.id = budget_id and is_member(b.building_id)));
drop policy if exists "budget items: admin write" on public.condo_budget_items;
create policy "budget items: admin write" on public.condo_budget_items for all to authenticated
  using (exists (select 1 from condo_budgets b where b.id = budget_id and is_condo_admin(b.building_id) and b.status = 'draft'))
  with check (exists (select 1 from condo_budgets b where b.id = budget_id and is_condo_admin(b.building_id) and b.status = 'draft'));

-- rate: ognuno vede le proprie, l'admin tutte. Le scritture passano dalle funzioni.
drop policy if exists "charges: read" on public.condo_charges;
create policy "charges: read" on public.condo_charges for select to authenticated
  using (user_id = auth.uid() or is_condo_admin(building_id));

drop policy if exists "movements: admin" on public.condo_bank_movements;
create policy "movements: admin" on public.condo_bank_movements for select to authenticated using (is_condo_admin(building_id));

grant select on public.condo_accounting_settings, public.condo_budgets, public.condo_budget_items, public.condo_charges, public.condo_bank_movements to authenticated;
grant insert, update, delete on public.condo_accounting_settings, public.condo_budgets, public.condo_budget_items to authenticated;

-- ── Funzioni ──

-- Anteprima ripartizione: quota annua di ogni proprietario iscritto
create or replace function public.budget_split(p_budget uuid)
returns table(user_id uuid, display_name text, millesimi numeric, yearly numeric, per_installment numeric)
language plpgsql stable security definer set search_path = public as $$
declare b condo_budgets%rowtype; total numeric;
begin
  select * into b from condo_budgets where id = p_budget;
  if not found or not is_condo_admin(b.building_id) then raise exception 'Non autorizzato' using errcode = '42501'; end if;
  select coalesce(sum(amount), 0) into total from condo_budget_items where budget_id = p_budget;
  return query
    select m.user_id, p.display_name, m.millesimi,
           round(total * m.millesimi / 1000, 2),
           round(total * m.millesimi / 1000 / b.installments, 2)
      from condo_members m join profiles p on p.id = m.user_id
     where m.building_id = b.building_id and m.millesimi is not null and coalesce(m.tenure, 'owner') <> 'tenant'
     order by p.display_name;
end $$;
revoke all on function public.budget_split(uuid) from public, anon;
grant execute on function public.budget_split(uuid) to authenticated;

-- Emissione delle rate del preventivo (una volta sola)
create or replace function public.issue_budget(p_budget uuid)
returns int language plpgsql security definer set search_path = public as $$
declare
  b condo_budgets%rowtype; total numeric; r record; i int; n int := 0;
  share numeric; inst numeric; last numeric; months int; due date;
  mesi text[] := array['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
begin
  select * into b from condo_budgets where id = p_budget for update;
  if not found or not is_condo_admin(b.building_id) then raise exception 'Non autorizzato' using errcode = '42501'; end if;
  if b.status <> 'draft' then raise exception 'Rate già emesse per questo preventivo' using errcode = '42501'; end if;
  select coalesce(sum(amount), 0) into total from condo_budget_items where budget_id = p_budget;
  if total <= 0 then raise exception 'Il preventivo è vuoto' using errcode = '22023'; end if;
  months := 12 / b.installments;
  for r in select m.user_id, m.millesimi from condo_members m
            where m.building_id = b.building_id and m.millesimi is not null and coalesce(m.tenure, 'owner') <> 'tenant' loop
    share := round(total * r.millesimi / 1000, 2);
    inst := round(share / b.installments, 2);
    last := share - inst * (b.installments - 1);  -- i centesimi di arrotondamento sull'ultima rata
    for i in 1..b.installments loop
      due := (b.first_due + make_interval(months => (i - 1) * months))::date;
      insert into condo_charges (building_id, user_id, budget_id, title, amount, due_date)
      values (b.building_id, r.user_id, b.id,
              case when b.installments = 12 then 'Quota condominiale – ' || mesi[extract(month from due)::int] || ' ' || extract(year from due)::int
                   when b.installments = 1 then 'Quota condominiale ' || b.year
                   else 'Quota condominiale ' || b.year || ' – rata ' || i || ' di ' || b.installments end,
              case when i = b.installments then last else inst end, due);
      n := n + 1;
    end loop;
  end loop;
  update condo_budgets set status = 'issued', issued_at = now() where id = p_budget;
  return n;
end $$;
revoke all on function public.issue_budget(uuid) from public, anon;
grant execute on function public.issue_budget(uuid) to authenticated;

-- Spesa singola (conguaglio, straordinaria) a un condomino o a tutti in millesimi
create or replace function public.add_charge(p_building uuid, p_title text, p_amount numeric, p_due date, p_user uuid default null, p_split boolean default false)
returns int language plpgsql security definer set search_path = public as $$
declare n int := 0; r record;
begin
  if not is_condo_admin(p_building) then raise exception 'Non autorizzato' using errcode = '42501'; end if;
  if p_amount <= 0 then raise exception 'Importo non valido' using errcode = '22023'; end if;
  if p_split then
    for r in select user_id, millesimi from condo_members
              where building_id = p_building and millesimi is not null and coalesce(tenure, 'owner') <> 'tenant' loop
      if round(p_amount * r.millesimi / 1000, 2) > 0 then
        insert into condo_charges (building_id, user_id, title, amount, due_date)
        values (p_building, r.user_id, p_title, round(p_amount * r.millesimi / 1000, 2), p_due);
        n := n + 1;
      end if;
    end loop;
  else
    if not exists (select 1 from condo_members where building_id = p_building and user_id = p_user) then
      raise exception 'Il condomino non fa parte del condominio' using errcode = '22023';
    end if;
    insert into condo_charges (building_id, user_id, title, amount, due_date) values (p_building, p_user, p_title, p_amount, p_due);
    n := 1;
  end if;
  return n;
end $$;
revoke all on function public.add_charge(uuid, text, numeric, date, uuid, boolean) from public, anon;
grant execute on function public.add_charge(uuid, text, numeric, date, uuid, boolean) to authenticated;

-- Il condomino dichiara di aver fatto il bonifico: la rata va "da confermare"
create or replace function public.report_bank_transfer(p_charges uuid[])
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update condo_charges set status = 'pending', reported_at = now(), payment_method = 'bonifico'
   where id = any(p_charges) and user_id = auth.uid() and status = 'open';
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.report_bank_transfer(uuid[]) from public, anon;
grant execute on function public.report_bank_transfer(uuid[]) to authenticated;

-- L'amministratore segna pagate una o più rate (a mano, bonifico confermato, import)
create or replace function public.mark_charges_paid(p_charges uuid[], p_method text default 'bonifico', p_paid_on date default null, p_ref text default null)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if exists (select 1 from condo_charges c where c.id = any(p_charges) and not is_condo_admin(c.building_id)) then
    raise exception 'Non autorizzato' using errcode = '42501';
  end if;
  update condo_charges set status = 'paid', paid_at = coalesce(p_paid_on::timestamptz, now()), paid_amount = amount,
         payment_method = coalesce(p_method, payment_method, 'bonifico'), payment_ref = coalesce(p_ref, payment_ref), confirmed_by = auth.uid()
   where id = any(p_charges) and status in ('open', 'pending');
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.mark_charges_paid(uuid[], text, date, text) from public, anon;
grant execute on function public.mark_charges_paid(uuid[], text, date, text) to authenticated;

-- Annulla: torna da pagare (errore di registrazione) o annulla la rata
create or replace function public.set_charge_status(p_charge uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare c condo_charges%rowtype;
begin
  select * into c from condo_charges where id = p_charge for update;
  if not found or not is_condo_admin(c.building_id) then raise exception 'Non autorizzato' using errcode = '42501'; end if;
  if p_status not in ('open', 'cancelled') then raise exception 'Stato non valido' using errcode = '22023'; end if;
  update condo_charges set status = p_status, paid_at = null, paid_amount = null, confirmed_by = null,
         reported_at = case when p_status = 'open' then null else reported_at end
   where id = p_charge;
  update condo_bank_movements set charge_id = null where charge_id = p_charge;
end $$;
revoke all on function public.set_charge_status(uuid, text) from public, anon;
grant execute on function public.set_charge_status(uuid, text) to authenticated;

-- Import estratto conto: salva i movimenti (senza doppioni) e segna pagate le rate abbinate
create or replace function public.import_bank_movements(p_building uuid, p_rows jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r jsonb; mid uuid; saved int := 0; dup int := 0; paid int := 0; cid uuid;
begin
  if not is_condo_admin(p_building) then raise exception 'Non autorizzato' using errcode = '42501'; end if;
  for r in select * from jsonb_array_elements(p_rows) loop
    insert into condo_bank_movements (building_id, booked_on, amount, description, payer, fingerprint)
    values (p_building, (r->>'date')::date, (r->>'amount')::numeric, left(r->>'description', 500), left(r->>'payer', 160), r->>'fingerprint')
    on conflict (building_id, fingerprint) do nothing
    returning id into mid;
    if mid is null then dup := dup + 1; continue; end if;
    saved := saved + 1;
    cid := nullif(r->>'charge_id', '')::uuid;
    if cid is not null and exists (select 1 from condo_charges where id = cid and building_id = p_building and status in ('open', 'pending')) then
      update condo_charges set status = 'paid', paid_at = (r->>'date')::date, paid_amount = amount, payment_method = 'bonifico',
             payment_ref = left(coalesce(r->>'description', ''), 200), confirmed_by = auth.uid()
       where id = cid;
      update condo_bank_movements set charge_id = cid where id = mid;
      paid := paid + 1;
    end if;
    mid := null;
  end loop;
  return jsonb_build_object('saved', saved, 'duplicates', dup, 'paid', paid);
end $$;
revoke all on function public.import_bank_movements(uuid, jsonb) from public, anon;
grant execute on function public.import_bank_movements(uuid, jsonb) to authenticated;

-- Impronte già importate (per mostrare i doppioni prima di confermare)
create or replace function public.known_movement_fingerprints(p_building uuid, p_fingerprints text[])
returns setof text language sql stable security definer set search_path = public as $$
  select fingerprint from condo_bank_movements
   where building_id = p_building and fingerprint = any(p_fingerprints) and is_condo_admin(p_building)
$$;
revoke all on function public.known_movement_fingerprints(uuid, text[]) from public, anon;
grant execute on function public.known_movement_fingerprints(uuid, text[]) to authenticated;

-- Elenco condomini con millesimi per l'amministratore (nomi per abbinare i bonifici)
create or replace function public.accounting_members(p_building uuid)
returns table(user_id uuid, display_name text, millesimi numeric, tenure text, floor text)
language sql stable security definer set search_path = public as $$
  select m.user_id, p.display_name, m.millesimi, m.tenure, m.floor
    from condo_members m join profiles p on p.id = m.user_id
   where m.building_id = p_building and is_condo_admin(p_building)
   order by p.display_name
$$;
revoke all on function public.accounting_members(uuid) from public, anon;
grant execute on function public.accounting_members(uuid) to authenticated;

-- Pagamento online confermato dal webhook Stripe (solo service role)
create or replace function public.mark_charges_paid_online(p_charges uuid[], p_method text, p_ref text)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update condo_charges set status = 'paid', paid_at = now(), paid_amount = amount, payment_method = p_method, payment_ref = p_ref
   where id = any(p_charges) and status in ('open', 'pending');
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.mark_charges_paid_online(uuid[], text, text) from public, anon, authenticated;
