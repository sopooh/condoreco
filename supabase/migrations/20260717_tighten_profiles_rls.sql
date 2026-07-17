-- Stringe l'accesso a public.profiles: la policy "profiles: public read"
-- (USING true) espone TUTTE le colonne — email compresa — a chiunque, anche
-- visitatori anonimi, via API REST. Le policy RLS lavorano per riga, non per
-- colonna, e la riga deve restare leggibile pubblicamente (le pagine
-- edificio/amministratore incorporano profiles(display_name, avatar_url, role)
-- nelle recensioni): il contenimento va quindi fatto con i GRANT di colonna.

-- 1. Rimuove la policy duplicata: fa lo stesso lavoro di "profiles: read own".
drop policy if exists profiles_select_own on public.profiles;

-- 2. GRANT per colonna: via il SELECT sull'intera tabella, si riconcedono solo
--    le colonne davvero usate dal client (lib/profile.js e gli embed
--    profiles(...) nelle query recensioni). Attenzione: da qui in poi un
--    select('*') su profiles fallisce per anon/authenticated — le query di
--    conteggio in lib/adminQueries.js selezionano 'id' per questo motivo.
revoke select on table public.profiles from anon, authenticated;
grant select (id, display_name, avatar_url, role)
  on public.profiles to anon;
grant select (id, display_name, avatar_url, role, zone, verified, created_at)
  on public.profiles to authenticated;

-- 3. La dashboard admin (lib/adminQueries.js) legge anche email e
--    admin_status: passa da questa vista security definer, che bypassa i
--    grant di colonna ma restituisce righe solo se il chiamante è un admin.
--    Il select su profiles dentro la vista gira col ruolo proprietario,
--    quindi niente ricorsione RLS sul check del ruolo.
create or replace view public.admin_profiles as
select p.id, p.display_name, p.email, p.avatar_url, p.role, p.admin_status, p.created_at
from public.profiles p
where exists (
  select 1 from public.profiles me
  where me.id = auth.uid() and me.role = 'admin'
);

-- I default privileges di Supabase concedono select anche ad anon sulle
-- nuove viste: revoca esplicita.
revoke all on public.admin_profiles from anon;
grant select on public.admin_profiles to authenticated;
