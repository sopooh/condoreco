-- Area "Lavora" del Recofixer: pagamenti ricevuti sulle fatture degli interventi.
alter table public.condo_intervention_files add column if not exists paid_cents bigint check (paid_cents is null or paid_cents >= 0);
alter table public.condo_intervention_files add column if not exists paid_at timestamptz;

-- Il fornitore dell'intervento (o l'amministratore del condominio) registra
-- quanto è stato pagato su una fattura. p_cents null = annulla.
create or replace function public.set_invoice_paid(p_file uuid, p_cents bigint)
returns void language plpgsql security definer set search_path = public as $$
declare v_int uuid; v_building uuid; v_kind text;
begin
  select f.intervention_id, f.kind, i.building_id into v_int, v_kind, v_building
    from condo_intervention_files f join condo_interventions i on i.id = f.intervention_id where f.id = p_file;
  if v_int is null then raise exception 'not found' using errcode = 'P0002'; end if;
  if v_kind <> 'invoice' then raise exception 'not an invoice' using errcode = '22023'; end if;
  if not (is_intervention_supplier(v_int) or is_condo_admin(v_building)) then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_cents is not null and p_cents < 0 then raise exception 'invalid amount' using errcode = '22023'; end if;
  update condo_intervention_files
     set paid_cents = p_cents, paid_at = case when p_cents is null then null else now() end
   where id = p_file;
end $$;
revoke execute on function public.set_invoice_paid(uuid, bigint) from public, anon;
grant execute on function public.set_invoice_paid(uuid, bigint) to authenticated;
