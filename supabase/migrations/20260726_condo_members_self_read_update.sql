-- Completa le policy self-service per condo_members, in aggiunta al self
-- enroll INSERT gia' aggiunto in 20260726_condo_members_self_enroll.sql:
--
-- 1) SELECT self: members_select gia' esiste ed e' basata su is_member(building_id),
--    ma se in futuro il client fa una .select() dopo l'upsert (Prefer:
--    return=representation), la riga appena inserita deve essere visibile
--    subito - aggiungiamo una policy diretta sul proprio user_id, che non
--    dipende dal risultato del giro precedente.
-- 2) UPDATE self: il wizard oggi usa ignoreDuplicates (ON CONFLICT DO
--    NOTHING, mai un vero UPDATE), ma se in futuro si vuole permettere un
--    nuovo tentativo di verifica su una riga gia' esistente (es. rifatta
--    dopo un rifiuto), serve una policy UPDATE. Resta 'resident'-only: non
--    permette di auto-promuoversi ad admin.
create policy "condo_members: select own row"
  on public.condo_members
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "condo_members: self update as resident"
  on public.condo_members
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and role = 'resident');
