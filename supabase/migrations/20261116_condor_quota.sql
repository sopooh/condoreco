-- Condor AI: accesso e limite giornaliero usati dalla edge function condor-chat-summary.
-- Beta: finche' gli abbonamenti non sono collegati a Stripe, has_condor e' vero
-- per tutti; il costo e' protetto dal limite di 20 usi al giorno per utente.
create table if not exists public.condor_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null default (now() at time zone 'Europe/Rome')::date,
  uses integer not null default 0,
  primary key (user_id, day)
);
alter table public.condor_usage enable row level security;

create or replace function public.has_condor(p_user uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select p_user is not null $$;

-- Registra un uso e ritorna gli usi rimasti oggi, oppure null se il limite e' raggiunto.
create or replace function public.condor_spend(p_user uuid, p_limit integer default 20)
returns integer language plpgsql security definer set search_path = public
as $$
declare v_uses integer;
begin
  insert into condor_usage as cu (user_id, day, uses)
  values (p_user, (now() at time zone 'Europe/Rome')::date, 1)
  on conflict (user_id, day) do update set uses = cu.uses + 1
    where cu.uses < p_limit
  returning uses into v_uses;
  if v_uses is null then return null; end if;
  return p_limit - v_uses;
end $$;

revoke all on function public.has_condor(uuid) from public, anon, authenticated;
revoke all on function public.condor_spend(uuid, integer) from public, anon, authenticated;
grant execute on function public.has_condor(uuid) to service_role;
grant execute on function public.condor_spend(uuid, integer) to service_role;

-- pulizia: tieni solo gli ultimi 30 giorni
select cron.schedule('condor_usage_cleanup', '17 3 * * *',
  $$delete from public.condor_usage where day < (now() at time zone 'Europe/Rome')::date - 30$$);
