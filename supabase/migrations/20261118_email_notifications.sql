-- Email di servizio via Resend (dominio mail.condoreco.com) per assemblee e rate.
-- Le colonne *_emailed_at "prenotano" l'invio: ogni email parte una volta sola.

-- Assemblee: copia di cortesia di convocazione e verbale (edge function assembly-send)
alter table public.condo_assemblies add column if not exists convocation_emailed_at timestamptz;
alter table public.condo_assemblies add column if not exists minutes_emailed_at timestamptz;

-- Rate: ricevuta, promemoria prima della scadenza, avviso di rata scaduta (edge function payment-mailer)
alter table public.condo_charges add column if not exists receipt_emailed_at timestamptz;
alter table public.condo_charges add column if not exists reminder_emailed_at timestamptz;
alter table public.condo_charges add column if not exists overdue_emailed_at timestamptz;

-- All'attivazione niente email arretrate: le rate già pagate o già scadute
-- risultano "già avvisate"; le assemblee già convocate o verbalizzate pure.
update public.condo_charges set receipt_emailed_at = now() where status = 'paid' and receipt_emailed_at is null;
update public.condo_charges set overdue_emailed_at = now() where status in ('open', 'pending') and due_date < current_date and overdue_emailed_at is null;
update public.condo_assemblies set convocation_emailed_at = now() where convocation_document_id is not null and convocation_emailed_at is null;
update public.condo_assemblies set minutes_emailed_at = now() where minutes_document_id is not null and minutes_emailed_at is null;

-- Una rata riaperta per errore di registrazione potrà avere di nuovo la ricevuta quando verrà pagata.
create or replace function public.set_charge_status(p_charge uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare c condo_charges%rowtype;
begin
  select * into c from condo_charges where id = p_charge for update;
  if not found or not is_condo_admin(c.building_id) then raise exception 'Non autorizzato' using errcode = '42501'; end if;
  if p_status not in ('open', 'cancelled') then raise exception 'Stato non valido' using errcode = '22023'; end if;
  update condo_charges set status = p_status, paid_at = null, paid_amount = null, confirmed_by = null,
         reported_at = case when p_status = 'open' then null else reported_at end,
         receipt_emailed_at = null
   where id = p_charge;
  update condo_bank_movements set charge_id = null where charge_id = p_charge;
end $$;
revoke all on function public.set_charge_status(uuid, text) from public, anon;
grant execute on function public.set_charge_status(uuid, text) to authenticated;

-- pg_cron ogni 15 minuti chiama payment-mailer con un gettone monouso, solo se c'è qualcosa da inviare
create or replace function public.run_payment_mailer()
returns bigint language plpgsql security definer set search_path = public, extensions as $$
declare t uuid; today date := (now() at time zone 'Europe/Rome')::date;
begin
  if not exists (select 1 from condo_charges where status = 'paid' and receipt_emailed_at is null and paid_at > now() - interval '7 days')
     and not exists (select 1 from condo_charges where status = 'open' and reminder_emailed_at is null and due_date between today and today + 3)
     and not exists (select 1 from condo_charges where status = 'open' and overdue_emailed_at is null and due_date < today and due_date >= today - 30) then
    return null;
  end if;
  insert into cleanup_tokens default values returning token into t;
  return net.http_post(
    url := 'https://ragltuoxnduohyqigkcg.supabase.co/functions/v1/payment-mailer',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('token', t),
    timeout_milliseconds := 60000
  );
end $$;
revoke all on function public.run_payment_mailer() from public, anon, authenticated;

select cron.unschedule('payment_mailer') where exists (select 1 from cron.job where jobname = 'payment_mailer');
select cron.schedule('payment_mailer', '*/15 * * * *', $$select public.run_payment_mailer()$$);
