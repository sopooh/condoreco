-- Posizione della sede degli studi (per la mappa Amministratori). Già applicata
-- su Supabase il 19/11/2026: 711 studi su 760 geolocalizzati abbinando l'indirizzo
-- ai civici del Comune (stesso civico, o il civico più vicino sulla stessa via).
alter table public.administrators add column if not exists lat double precision;
alter table public.administrators add column if not exists lng double precision;
-- admin_scores ricreata aggiungendo a.lat, a.lng in coda (vedi 20261119_administrators_registro_imprese.sql).
