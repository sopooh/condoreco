-- Elenco fornitori del condominio: contratti, scadenze, DURC e polizze.
-- Si appoggia alla rubrica esistente (condo_maintainers, quella di "I tuoi
-- interventi"). I file (contratto firmato, DURC, polizza) vanno nell'archivio
-- documenti come documenti riservati, così sono anche cercabili per contenuto
-- e pronti per lo specchietto preventivi e i sinistri.
-- Gestione: solo amministratori. I residenti vedono solo se un fornitore è in
-- regola (supplier_compliance), non importi né documenti.

create table if not exists public.condo_supplier_contracts (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id) on delete cascade,
  maintainer_id uuid not null references public.condo_maintainers(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 160),
  service_category text,
  start_date date,
  end_date date,
  auto_renew boolean not null default false,
  renewal_months int check (renewal_months is null or renewal_months between 1 and 120),
  notice_days int check (notice_days is null or notice_days between 0 and 730),
  amount_cents bigint check (amount_cents is null or amount_cents >= 0),
  amount_period text check (amount_period is null or amount_period in ('one_off', 'monthly', 'quarterly', 'half_yearly', 'yearly')),
  status text not null default 'active' check (status in ('active', 'terminated', 'expired')),
  document_id uuid references public.condo_documents(id) on delete set null,
  notes text check (notes is null or char_length(notes) <= 1000),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);
create index if not exists condo_supplier_contracts_building_idx on public.condo_supplier_contracts (building_id, end_date);
create index if not exists condo_supplier_contracts_maintainer_idx on public.condo_supplier_contracts (maintainer_id);

create table if not exists public.condo_supplier_documents (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id) on delete cascade,
  maintainer_id uuid not null references public.condo_maintainers(id) on delete cascade,
  kind text not null check (kind in ('durc', 'insurance_rc', 'insurance_other', 'visura', 'soa', 'certification', 'other')),
  issued_on date,
  expires_on date,
  insurer text check (insurer is null or char_length(insurer) <= 120),
  policy_number text check (policy_number is null or char_length(policy_number) <= 60),
  coverage_cents bigint check (coverage_cents is null or coverage_cents >= 0),
  document_id uuid references public.condo_documents(id) on delete set null,
  notes text check (notes is null or char_length(notes) <= 500),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (expires_on is null or issued_on is null or expires_on >= issued_on)
);
create index if not exists condo_supplier_documents_building_idx on public.condo_supplier_documents (building_id, expires_on);
create index if not exists condo_supplier_documents_maintainer_idx on public.condo_supplier_documents (maintainer_id, kind);

-- Coerenza edificio + default di validità del DURC (120 giorni dal rilascio).
create or replace function public.check_supplier_row()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from condo_maintainers m where m.id = new.maintainer_id and m.building_id = new.building_id) then
    raise exception 'supplier does not belong to this building' using errcode = '23514';
  end if;
  if new.document_id is not null
     and not exists (select 1 from condo_documents d where d.id = new.document_id and d.building_id = new.building_id) then
    raise exception 'document does not belong to this building' using errcode = '23514';
  end if;
  if tg_table_name = 'condo_supplier_documents' and new.kind = 'durc'
     and new.expires_on is null and new.issued_on is not null then
    new.expires_on := new.issued_on + 120;
  end if;
  return new;
end $$;
revoke all on function public.check_supplier_row() from public, anon, authenticated;

drop trigger if exists condo_supplier_contracts_check on public.condo_supplier_contracts;
create trigger condo_supplier_contracts_check before insert or update on public.condo_supplier_contracts
  for each row execute function public.check_supplier_row();
drop trigger if exists condo_supplier_documents_check on public.condo_supplier_documents;
create trigger condo_supplier_documents_check before insert or update on public.condo_supplier_documents
  for each row execute function public.check_supplier_row();
drop trigger if exists condo_supplier_contracts_touch on public.condo_supplier_contracts;
create trigger condo_supplier_contracts_touch before update on public.condo_supplier_contracts
  for each row execute function public.set_updated_at();

alter table public.condo_supplier_contracts enable row level security;
alter table public.condo_supplier_documents enable row level security;
revoke all on public.condo_supplier_contracts, public.condo_supplier_documents from anon;
grant select, insert, update, delete on public.condo_supplier_contracts, public.condo_supplier_documents to authenticated;

drop policy if exists "supplier contracts: admin" on public.condo_supplier_contracts;
create policy "supplier contracts: admin" on public.condo_supplier_contracts for all to authenticated
  using (public.is_condo_admin(building_id)) with check (public.is_condo_admin(building_id));
drop policy if exists "supplier docs: admin" on public.condo_supplier_documents;
create policy "supplier docs: admin" on public.condo_supplier_documents for all to authenticated
  using (public.is_condo_admin(building_id)) with check (public.is_condo_admin(building_id));

-- Scadenze dei fornitori nei prossimi p_days giorni (e quelle già passate). Solo admin.
-- Base per lo scadenzario e per i promemoria automatici.
create or replace function public.supplier_deadlines(p_building uuid, p_days int default 60)
returns table (
  kind text, item_id uuid, maintainer_id uuid, supplier text, title text,
  due_date date, days_left int
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_condo_admin(p_building) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query
  select x.k, x.iid, x.mid, x.sup, x.ttl, x.dd, x.dl from (
    select 'contract_notice'::text, c.id, c.maintainer_id, coalesce(m.company, m.name), c.title,
           (c.end_date - coalesce(c.notice_days, 0))::date, ((c.end_date - coalesce(c.notice_days, 0)) - current_date)::int
      from condo_supplier_contracts c join condo_maintainers m on m.id = c.maintainer_id
     where c.building_id = p_building and c.status = 'active' and c.end_date is not null and coalesce(c.notice_days, 0) > 0
    union all
    select 'contract_end', c.id, c.maintainer_id, coalesce(m.company, m.name), c.title,
           c.end_date, (c.end_date - current_date)::int
      from condo_supplier_contracts c join condo_maintainers m on m.id = c.maintainer_id
     where c.building_id = p_building and c.status = 'active' and c.end_date is not null
    union all
    select 'document_' || d.kind, d.id, d.maintainer_id, coalesce(m.company, m.name), d.kind,
           d.expires_on, (d.expires_on - current_date)::int
      from condo_supplier_documents d join condo_maintainers m on m.id = d.maintainer_id
     where d.building_id = p_building and d.expires_on is not null
       -- conta solo l'ultimo documento di ogni tipo per fornitore
       and not exists (select 1 from condo_supplier_documents n
                        where n.maintainer_id = d.maintainer_id and n.kind = d.kind
                          and n.expires_on > d.expires_on)
  ) x(k, iid, mid, sup, ttl, dd, dl)
  where x.dl <= p_days
  order by x.dd;
end $$;
revoke all on function public.supplier_deadlines(uuid, int) from public, anon;
grant execute on function public.supplier_deadlines(uuid, int) to authenticated;

-- Per i residenti: il fornitore è in regola? (DURC valido, RC valida). Nessun dettaglio.
create or replace function public.supplier_compliance(p_building uuid)
returns table (maintainer_id uuid, durc_valid boolean, insurance_valid boolean, has_contract boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_member(p_building) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query
  select m.id,
         exists (select 1 from condo_supplier_documents d where d.maintainer_id = m.id and d.kind = 'durc'
                   and (d.expires_on is null or d.expires_on >= current_date)),
         exists (select 1 from condo_supplier_documents d where d.maintainer_id = m.id and d.kind = 'insurance_rc'
                   and (d.expires_on is null or d.expires_on >= current_date)),
         exists (select 1 from condo_supplier_contracts c where c.maintainer_id = m.id and c.status = 'active'
                   and (c.end_date is null or c.end_date >= current_date))
  from condo_maintainers m
  where m.building_id = p_building;
end $$;
revoke all on function public.supplier_compliance(uuid) from public, anon;
grant execute on function public.supplier_compliance(uuid) to authenticated;

-- Contratti scaduti: passano a 'expired' ogni notte (quelli con rinnovo tacito si allungano).
create or replace function public.roll_supplier_contracts()
returns void language plpgsql security definer set search_path = public as $$
begin
  update condo_supplier_contracts
     set end_date = (end_date + make_interval(months => coalesce(renewal_months, 12)))::date
   where status = 'active' and auto_renew and end_date is not null and end_date < current_date;
  update condo_supplier_contracts
     set status = 'expired'
   where status = 'active' and not auto_renew and end_date is not null and end_date < current_date;
end $$;
revoke all on function public.roll_supplier_contracts() from public, anon, authenticated;

select cron.unschedule('roll_supplier_contracts') where exists (select 1 from cron.job where jobname = 'roll_supplier_contracts');
select cron.schedule('roll_supplier_contracts', '17 2 * * *', $$select public.roll_supplier_contracts()$$);
