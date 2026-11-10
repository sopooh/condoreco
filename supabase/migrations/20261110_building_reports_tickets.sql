-- Ticket della "Bacheca urgente" nell'area condominio: riusano
-- public.building_reports (stessa fonte della sezione "Segnalazioni" pubblica
-- sulla pagina edificio) con stato aperto/chiuso.
--   aperto  = status 'open' o 'under_review'
--   chiuso  = status 'resolved' (+ resolved_at, resolved_by)

alter table public.building_reports add column if not exists title text;
alter table public.building_reports add column if not exists resolved_by uuid references auth.users (id) on delete set null;

-- Chi puo' cambiare lo stato: chi ha aperto il ticket o un admin del
-- condominio (condo_members.role = 'admin'). Nessun altro update.
drop policy if exists "building_reports: owner or condo admin update" on public.building_reports;
create policy "building_reports: owner or condo admin update"
  on public.building_reports
  for update
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.condo_members m
      where m.building_id = building_reports.building_id
        and m.user_id = auth.uid()
        and m.role = 'admin'
    )
  )
  with check (
    user_id = auth.uid()
    or exists (
      select 1 from public.condo_members m
      where m.building_id = building_reports.building_id
        and m.user_id = auth.uid()
        and m.role = 'admin'
    )
  );

grant update (status, resolved_at, resolved_by) on public.building_reports to authenticated;
