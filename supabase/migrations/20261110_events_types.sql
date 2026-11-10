-- Nuove categorie per gli appuntamenti del calendario condominiale:
-- energy (Energia), services (Servizi), other (Altro), oltre a
-- general / meeting / maintenance / water.
-- Rimuove l'eventuale CHECK esistente su events.event_type (nome non noto)
-- e ne crea uno con l'elenco completo.

do $$
declare c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public' and rel.relname = 'events' and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%event_type%'
  loop
    execute format('alter table public.events drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.events
  add constraint events_event_type_check
  check (event_type in ('general', 'meeting', 'maintenance', 'water', 'energy', 'services', 'other'));
