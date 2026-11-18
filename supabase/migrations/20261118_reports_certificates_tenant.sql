-- Punto 10 della roadmap: rendiconto mensile per i consiglieri, attestazione dello stato
-- dei pagamenti per il rogito, quota a carico dell'inquilino separata da quella del proprietario.

-- ---------- Consiglieri (art. 1130-bis c.c.) ----------
alter table public.condo_members add column if not exists is_councillor boolean not null default false;

create or replace function public.is_councillor(p_building uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from condo_members where building_id = p_building and user_id = auth.uid() and is_councillor)
$$;
revoke all on function public.is_councillor(uuid) from public, anon;
grant execute on function public.is_councillor(uuid) to authenticated;

create or replace function public.set_councillor(p_building uuid, p_user uuid, p_on boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_condo_admin(p_building) then raise exception 'not allowed' using errcode = '42501'; end if;
  update condo_members set is_councillor = coalesce(p_on, false) where building_id = p_building and user_id = p_user;
end $$;
revoke all on function public.set_councillor(uuid, uuid, boolean) from public, anon;
grant execute on function public.set_councillor(uuid, uuid, boolean) to authenticated;

-- ---------- Quota inquilino (art. 9 L. 392/1978, prassi della tabella Confedilizia) ----------
-- Percentuale di ogni voce del preventivo a carico dell'inquilino. Valori proposti per
-- categoria, modificabili voce per voce dall'amministratore.
alter table public.condo_budget_items add column if not exists tenant_share numeric(5,2)
  check (tenant_share is null or (tenant_share >= 0 and tenant_share <= 100));

create or replace function public.default_tenant_share(p_category text)
returns numeric language sql immutable as $$
  select case p_category
    when 'services' then 100   -- pulizie, portierato (90% in alcune tabelle), giardino
    when 'utilities' then 100  -- luce scale, acqua, riscaldamento
    when 'maintenance' then 50 -- piccola manutenzione ordinaria: da rivedere voce per voce
    else 0                     -- assicurazione, compenso amministratore, altro: proprietario
  end::numeric
$$;

create or replace function public.item_tenant_share(i public.condo_budget_items)
returns numeric language sql stable as $$
  select coalesce(i.tenant_share, public.default_tenant_share(i.category))
$$;

-- Quota inquilino di ogni rata: le rate dei preventivi seguono le voci del preventivo;
-- rate senza preventivo (spese straordinarie, addebiti singoli) sono del proprietario.
create or replace function public.charge_tenant_ratio(p_budget uuid)
returns numeric language sql stable security definer set search_path = public as $$
  select coalesce(sum(i.amount * public.item_tenant_share(i) / 100) / nullif(sum(i.amount), 0), 0)
  from condo_budget_items i where i.budget_id = p_budget
$$;
revoke all on function public.charge_tenant_ratio(uuid) from public, anon;
grant execute on function public.charge_tenant_ratio(uuid) to authenticated;

-- Ripartizione proprietario/inquilino delle rate di un condomino in un anno.
-- La vede l'amministratore, o il condomino per sé.
create or replace function public.tenant_split(p_building uuid, p_user uuid, p_year int)
returns table (charge_id uuid, title text, due_date date, kind text, status text, amount numeric, tenant_amount numeric, owner_amount numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  if not (public.is_condo_admin(p_building) or (p_user = auth.uid() and public.is_member(p_building))) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query
  select c.id, c.title, c.due_date, c.kind, c.status, c.amount,
         round(c.amount * case when c.budget_id is null then 0 else public.charge_tenant_ratio(c.budget_id) end, 2),
         c.amount - round(c.amount * case when c.budget_id is null then 0 else public.charge_tenant_ratio(c.budget_id) end, 2)
  from condo_charges c
  where c.building_id = p_building and c.user_id = p_user and c.status <> 'cancelled'
    and extract(year from c.due_date) = p_year
  order by c.due_date;
end $$;
revoke all on function public.tenant_split(uuid, uuid, int) from public, anon;
grant execute on function public.tenant_split(uuid, uuid, int) to authenticated;

-- ---------- Rendiconto mensile ----------
create table if not exists public.condo_monthly_reports (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  data jsonb not null,
  ai_comment text check (ai_comment is null or char_length(ai_comment) <= 4000),
  generated_at timestamptz not null default now(),
  emailed_at timestamptz,
  unique (building_id, month)
);
alter table public.condo_monthly_reports enable row level security;
revoke all on public.condo_monthly_reports from anon, authenticated;
grant select on public.condo_monthly_reports to authenticated;
drop policy if exists "monthly reports: admin and councillors" on public.condo_monthly_reports;
create policy "monthly reports: admin and councillors" on public.condo_monthly_reports for select to authenticated
  using (public.is_condo_admin(building_id) or public.is_councillor(building_id));

-- Calcola i numeri del mese (solo totali e conteggi: niente nomi dei morosi).
create or replace function public.compute_monthly_report(p_building uuid, p_month date)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  m0 date := date_trunc('month', p_month)::date;
  m1 date := (date_trunc('month', p_month) + interval '1 month')::date;
  y int := extract(year from p_month)::int;
  res jsonb;
begin
  select jsonb_build_object(
    'month', m0, 'year', y,
    'issued', (select jsonb_build_object(
        'ordinaria', coalesce(sum(amount) filter (where kind = 'ordinaria'), 0),
        'straordinaria', coalesce(sum(amount) filter (where kind = 'straordinaria'), 0),
        'count', count(*))
      from condo_charges where building_id = p_building and status <> 'cancelled' and due_date >= m0 and due_date < m1),
    'collected', (select jsonb_build_object('amount', coalesce(sum(coalesce(paid_amount, amount)), 0), 'count', count(*))
      from condo_charges where building_id = p_building and status = 'paid' and paid_at >= m0 and paid_at < m1),
    'arrears', (select jsonb_build_object(
        'amount', coalesce(sum(amount), 0),
        'members', count(distinct user_id),
        'over_90_days', coalesce(sum(amount) filter (where due_date < m1 - 90), 0))
      from condo_charges where building_id = p_building and status in ('open', 'pending') and due_date < m1),
    'expenses', coalesce((select jsonb_object_agg(category, total) from (
        select coalesce(category, 'other') as category, sum(amount) as total from condo_expenses
        where building_id = p_building and spent_on >= m0 and spent_on < m1 group by 1) e), '{}'::jsonb),
    'expenses_total', (select coalesce(sum(amount), 0) from condo_expenses where building_id = p_building and spent_on >= m0 and spent_on < m1),
    'bank', (select jsonb_build_object(
        'in', coalesce(sum(amount) filter (where amount > 0), 0),
        'out', coalesce(-sum(amount) filter (where amount < 0), 0))
      from condo_bank_movements where building_id = p_building and booked_on >= m0 and booked_on < m1),
    'year_to_date', jsonb_build_object(
      'budget', (select coalesce(sum(i.amount), 0) from condo_budget_items i join condo_budgets b on b.id = i.budget_id
                 where b.building_id = p_building and b.year = y),
      'spent', (select coalesce(sum(amount), 0) from condo_expenses where building_id = p_building and spent_on >= make_date(y, 1, 1) and spent_on < m1),
      'collected', (select coalesce(sum(coalesce(paid_amount, amount)), 0) from condo_charges
                    where building_id = p_building and status = 'paid' and paid_at >= make_date(y, 1, 1) and paid_at < m1),
      'issued', (select coalesce(sum(amount), 0) from condo_charges
                 where building_id = p_building and status <> 'cancelled' and due_date >= make_date(y, 1, 1) and due_date < m1)),
    'works', jsonb_build_object(
      'interventions_done', (select count(*) from condo_interventions where building_id = p_building and completed_at >= m0 and completed_at < m1),
      'practices_open', (select count(*) from condo_practices where building_id = p_building and status not in ('closed', 'cancelled', 'done')),
      'tickets_open', (select count(*) from condo_tickets where building_id = p_building and status <> 'closed'))
  ) into res;
  return res;
end $$;
revoke all on function public.compute_monthly_report(uuid, date) from public, anon, authenticated;

-- L'amministratore può (ri)generare un mese a mano; il cron genera il mese precedente.
create or replace function public.generate_monthly_report(p_building uuid, p_month date)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; m0 date := date_trunc('month', p_month)::date;
begin
  if auth.uid() is not null and not public.is_condo_admin(p_building) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  insert into condo_monthly_reports (building_id, month, data, generated_at)
  values (p_building, m0, public.compute_monthly_report(p_building, m0), now())
  on conflict (building_id, month) do update set data = excluded.data, generated_at = now()
  returning id into v_id;
  return v_id;
end $$;
revoke all on function public.generate_monthly_report(uuid, date) from public, anon;
grant execute on function public.generate_monthly_report(uuid, date) to authenticated;

-- Il primo del mese: genera il rendiconto del mese precedente per i condomini con
-- contabilità attiva, poi chiama l'edge function che aggiunge il commento di Condor
-- e manda l'email ai consiglieri.
create or replace function public.run_monthly_reports()
returns bigint language plpgsql security definer set search_path = public, extensions as $$
declare b uuid; t uuid; prev date := (date_trunc('month', now() at time zone 'Europe/Rome') - interval '1 month')::date;
begin
  for b in select distinct building_id from condo_charges loop
    perform public.generate_monthly_report(b, prev);
  end loop;
  insert into cleanup_tokens default values returning token into t;
  return net.http_post(
    url := 'https://ragltuoxnduohyqigkcg.supabase.co/functions/v1/monthly-reports',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('token', t, 'month', prev),
    timeout_milliseconds := 120000
  );
end $$;
revoke all on function public.run_monthly_reports() from public, anon, authenticated;
select cron.unschedule('monthly_reports') where exists (select 1 from cron.job where jobname = 'monthly_reports');
select cron.schedule('monthly_reports', '23 5 1 * *', $$select public.run_monthly_reports()$$);

-- ---------- Attestazione dello stato dei pagamenti (rogito) ----------
-- art. 1130 n. 9 c.c.: l'amministratore attesta lo stato dei pagamenti degli oneri e le
-- liti in corso. art. 63 c. 4 disp. att.: chi compra risponde in solido dei contributi
-- dell'anno in corso e di quello precedente: l'attestazione copre questi due anni.
create table if not exists public.condo_payment_certificates (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  as_of date not null,
  totals jsonb not null,
  document_id uuid references public.condo_documents(id) on delete set null,
  notes text check (notes is null or char_length(notes) <= 2000),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists condo_payment_certificates_user_idx on public.condo_payment_certificates (building_id, user_id, created_at desc);
alter table public.condo_payment_certificates enable row level security;
revoke all on public.condo_payment_certificates from anon, authenticated;
grant select on public.condo_payment_certificates to authenticated;
drop policy if exists "certificates: admin or owner" on public.condo_payment_certificates;
create policy "certificates: admin or owner" on public.condo_payment_certificates for select to authenticated
  using (public.is_condo_admin(building_id) or user_id = auth.uid());

create or replace function public.payment_statement(p_building uuid, p_user uuid, p_as_of date default current_date)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare y int := extract(year from p_as_of)::int; res jsonb;
begin
  if not (public.is_condo_admin(p_building) or (p_user = auth.uid() and public.is_member(p_building))) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'as_of', p_as_of, 'years', jsonb_build_array(y - 1, y),
    'due', coalesce(sum(amount) filter (where due_date <= p_as_of), 0),
    'paid', coalesce(sum(coalesce(paid_amount, amount)) filter (where status = 'paid' and paid_at::date <= p_as_of), 0),
    'open_due', coalesce(sum(amount) filter (where status in ('open', 'pending') and due_date <= p_as_of), 0),
    'open_future', coalesce(sum(amount) filter (where status in ('open', 'pending') and due_date > p_as_of), 0),
    'pending_check', coalesce(sum(amount) filter (where status = 'pending'), 0),
    'charges', coalesce(jsonb_agg(jsonb_build_object(
        'title', title, 'kind', kind, 'due_date', due_date, 'amount', amount, 'status', status,
        'paid_at', paid_at::date) order by due_date), '[]'::jsonb)
  ) into res
  from condo_charges
  where building_id = p_building and user_id = p_user and status <> 'cancelled'
    and extract(year from due_date) between y - 1 and y;
  return res;
end $$;
revoke all on function public.payment_statement(uuid, uuid, date) from public, anon;
grant execute on function public.payment_statement(uuid, uuid, date) to authenticated;
