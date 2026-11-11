-- Contabili dei bonifici: il condomino carica la ricevuta (PDF o foto) per una o più rate,
-- le rate passano "da confermare", l'amministratore valida (rate pagate) o respinge.
-- Le contabili restano in archivio per entrambi.

create table if not exists public.condo_payment_receipts (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  charge_ids uuid[] not null default '{}',
  file_path text not null,
  file_name text not null check (char_length(file_name) <= 200),
  amount numeric(12,2) check (amount is null or amount > 0),
  paid_on date,
  note text check (note is null or char_length(note) <= 500),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  reject_reason text check (reject_reason is null or char_length(reject_reason) <= 300),
  created_at timestamptz not null default now()
);
create index if not exists condo_payment_receipts_building_idx on public.condo_payment_receipts(building_id, status, created_at desc);

alter table public.condo_payment_receipts enable row level security;
drop policy if exists "receipts: read" on public.condo_payment_receipts;
create policy "receipts: read" on public.condo_payment_receipts for select to authenticated
  using (user_id = auth.uid() or is_condo_admin(building_id));
grant select on public.condo_payment_receipts to authenticated;

-- Bucket privato: <building>/<utente>/<file>
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-receipts', 'payment-receipts', false, 10485760, array['application/pdf','image/jpeg','image/png','image/webp','image/heic'])
on conflict (id) do update set public = false, file_size_limit = 10485760, allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.receipt_file_access(p_name text, p_write boolean)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  parts text[] := string_to_array(p_name, '/');
  uuid_re constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
begin
  if array_length(parts, 1) <> 3 or parts[1] !~ uuid_re or parts[2] !~ uuid_re then return false; end if;
  if p_write then return parts[2]::uuid = auth.uid() and is_member(parts[1]::uuid); end if;
  return parts[2]::uuid = auth.uid() or is_condo_admin(parts[1]::uuid);
end $$;
revoke all on function public.receipt_file_access(text, boolean) from public, anon;
grant execute on function public.receipt_file_access(text, boolean) to authenticated;

drop policy if exists "receipts files: read" on storage.objects;
create policy "receipts files: read" on storage.objects for select to authenticated
  using (bucket_id = 'payment-receipts' and public.receipt_file_access(name, false));
drop policy if exists "receipts files: upload" on storage.objects;
create policy "receipts files: upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'payment-receipts' and public.receipt_file_access(name, true));

-- Il condomino invia la contabile: le rate indicate (sue, da pagare) vanno "da confermare"
create or replace function public.submit_payment_receipt(p_building uuid, p_charges uuid[], p_path text, p_name text, p_amount numeric, p_paid_on date, p_note text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare rid uuid; ok_ids uuid[];
begin
  if not is_member(p_building) then raise exception 'Non autorizzato' using errcode = '42501'; end if;
  if p_path not like p_building::text || '/' || auth.uid()::text || '/%' then raise exception 'File non valido' using errcode = '22023'; end if;
  select coalesce(array_agg(id), '{}') into ok_ids from condo_charges
   where id = any(coalesce(p_charges, '{}')) and user_id = auth.uid() and building_id = p_building and status in ('open', 'pending');
  insert into condo_payment_receipts (building_id, user_id, charge_ids, file_path, file_name, amount, paid_on, note)
  values (p_building, auth.uid(), ok_ids, p_path, left(p_name, 200), p_amount, p_paid_on, nullif(trim(p_note), ''))
  returning id into rid;
  update condo_charges set status = 'pending', reported_at = now(), payment_method = 'bonifico'
   where id = any(ok_ids) and status = 'open';
  return rid;
end $$;
revoke all on function public.submit_payment_receipt(uuid, uuid[], text, text, numeric, date, text) from public, anon;
grant execute on function public.submit_payment_receipt(uuid, uuid[], text, text, numeric, date, text) to authenticated;

-- L'amministratore valida (rate pagate) o respinge (rate di nuovo da pagare)
create or replace function public.review_payment_receipt(p_receipt uuid, p_approve boolean, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare r condo_payment_receipts%rowtype;
begin
  select * into r from condo_payment_receipts where id = p_receipt for update;
  if not found or not is_condo_admin(r.building_id) then raise exception 'Non autorizzato' using errcode = '42501'; end if;
  if r.status <> 'pending' then raise exception 'Contabile già esaminata' using errcode = '42501'; end if;
  update condo_payment_receipts set status = case when p_approve then 'approved' else 'rejected' end,
         reviewed_by = auth.uid(), reviewed_at = now(), reject_reason = case when p_approve then null else nullif(trim(p_reason), '') end
   where id = p_receipt;
  if p_approve then
    update condo_charges set status = 'paid', paid_at = coalesce(r.paid_on::timestamptz, now()), paid_amount = amount,
           payment_method = 'bonifico', payment_ref = 'contabile ' || r.file_name, confirmed_by = auth.uid()
     where id = any(r.charge_ids) and status in ('open', 'pending');
  else
    update condo_charges set status = 'open', reported_at = null
     where id = any(r.charge_ids) and status = 'pending';
  end if;
end $$;
revoke all on function public.review_payment_receipt(uuid, boolean, text) from public, anon;
grant execute on function public.review_payment_receipt(uuid, boolean, text) to authenticated;
