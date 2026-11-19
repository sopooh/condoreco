-- Archivio civici del Comune di Milano (dataset ds634, CC BY) dentro buildings.
-- I civici importati hanno status 'imported' (non ancora recensiti).
-- Alla prima recensione di un utente passano automaticamente a 'pending' (Da verificare).

alter table public.buildings drop constraint if exists buildings_status_check;
alter table public.buildings add constraint buildings_status_check
  check (status = any (array['pending', 'verified', 'in_verifica', 'imported']));

alter table public.buildings add column if not exists source text;
alter table public.buildings add column if not exists source_id text;

-- Vincolo pieno (non indice parziale) così l'upsert via PostgREST con onConflict funziona.
-- I NULL sono distinti, quindi i palazzi inseriti dagli utenti non entrano in conflitto.
alter table public.buildings drop constraint if exists buildings_source_key;
alter table public.buildings add constraint buildings_source_key unique (source, source_id);

create index if not exists buildings_status_idx on public.buildings (status);

-- Prima recensione su un civico importato: diventa 'pending' (Da verificare).
create or replace function public.promote_imported_building_on_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.buildings
     set status = 'pending'
   where id = new.building_id
     and status = 'imported';
  return new;
end;
$$;

drop trigger if exists trg_promote_imported_building on public.reviews;
create trigger trg_promote_imported_building
  after insert on public.reviews
  for each row execute function public.promote_imported_building_on_review();
