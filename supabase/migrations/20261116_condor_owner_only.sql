-- Condor AI in prova: solo l'account della titolare finche' gli abbonamenti non sono collegati.
create or replace function public.has_condor(p_user uuid)
returns boolean language sql stable security definer set search_path = public, auth
as $$ select exists (select 1 from auth.users where id = p_user and lower(email) = 'sos.sophie99@gmail.com') $$;
revoke all on function public.has_condor(uuid) from public, anon, authenticated;
grant execute on function public.has_condor(uuid) to service_role;
