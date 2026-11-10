-- Correzioni dall'advisor di sicurezza Supabase (10/11/2026).
--
-- 1. set_cover_override / recalculate_cover erano SECURITY DEFINER senza
--    controlli e richiamabili da anon via /rest/v1/rpc: chiunque poteva
--    cambiare la foto di copertina di qualsiasi edificio.
--    - set_cover_override: solo admin di piattaforma (pannello admin)
--    - entrambe: niente piu' EXECUTE per anon
-- 2. Funzioni usate solo da trigger o da job: nessun EXECUTE via API.
--    (I trigger non controllano il privilegio EXECUTE quando scattano.)
-- 3. search_path fisso sulle funzioni segnalate.
-- 4. pg_cron + job orario per close_expired_polls (prima non girava:
--    l'estensione non era installata).
-- is_member / is_condo_admin / is_admin restano eseguibili: le usano le
-- policy RLS, anche per richieste anonime.

-- 1 ------------------------------------------------------------------------
create or replace function public.set_cover_override(p_photo_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_building_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Solo gli amministratori possono scegliere la copertina' using errcode = '42501';
  end if;

  select building_id into v_building_id from photos where id = p_photo_id;
  if v_building_id is null then return; end if;

  update photos
  set admin_cover_override = false, is_cover = false
  where building_id = v_building_id;

  update photos
  set admin_cover_override = true, is_cover = true
  where id = p_photo_id and status = 'approved';
end;
$$;

revoke execute on function public.set_cover_override(uuid) from public, anon;
grant execute on function public.set_cover_override(uuid) to authenticated;

revoke execute on function public.recalculate_cover(uuid) from public, anon;
grant execute on function public.recalculate_cover(uuid) to authenticated;

-- 2 ------------------------------------------------------------------------
revoke execute on function public.enforce_review_moderation() from public, anon, authenticated;
revoke execute on function public.enforce_admin_review_moderation() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.log_review_change() from public, anon, authenticated;
revoke execute on function public.protect_role_column() from public, anon, authenticated;
revoke execute on function public.close_expired_polls() from public, anon, authenticated;

-- 3 ------------------------------------------------------------------------
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'handle_new_user', 'sync_building_location', 'nearby_buildings',
        'recalculate_cover', 'set_cover_override', 'trigger_photo_cover',
        'enforce_review_moderation', 'enforce_admin_review_moderation',
        'is_admin', 'protect_role_column', 'set_updated_at'
      )
  loop
    execute format('alter function %s set search_path = public', f.sig);
  end loop;
end $$;

-- 4 ------------------------------------------------------------------------
create extension if not exists pg_cron;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'close-expired-polls') then
    perform cron.unschedule('close-expired-polls');
  end if;
end $$;

select cron.schedule('close-expired-polls', '5 * * * *', 'select public.close_expired_polls()');
