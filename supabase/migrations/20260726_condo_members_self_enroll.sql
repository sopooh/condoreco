-- Il wizard di verifica residenza (app/edificio/[id]/condominio/verifica) ora
-- scrive una riga vera in condo_members al termine del flusso, invece di
-- limitarsi allo stato mock in localStorage (vedi lib/residenceVerification.js).
-- Finora l'unico modo per diventare membro era un insert manuale da SQL
-- Editor con la service role key — da cui il bug per cui alcuni edifici
-- "funzionavano" (chi ci aveva pensato) e altri no (nessuno l'aveva fatto).
--
-- Manca quindi: 1) un vincolo di unicità su cui appoggiare l'upsert lato
-- client, 2) la policy che permetta all'utente autenticato di inserire la
-- propria riga.

create unique index if not exists condo_members_building_user_idx
  on public.condo_members (building_id, user_id);

-- Un utente autenticato può auto-iscriversi come 'resident' (mai 'admin') e
-- solo per se stesso: niente iscrizioni per conto di altri, niente
-- auto-promozione ad admin. La verifica documentale resta simulata (vedi
-- commento nel wizard) finché non esiste un vero processo di revisione;
-- questa policy è quindi volutamente permissiva, coerente con lo stato
-- "prima implementazione mock" del resto del flusso.
create policy "condo_members: self enroll as resident"
  on public.condo_members
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and role = 'resident'
  );
