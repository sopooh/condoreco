-- Ricerca per indirizzo veloce con ~327k palazzi (civici Milano + Roma):
-- indici trigram per gli ilike '%...%' di Esplora e del completamento automatico.
-- Già applicata su Supabase (progetto condorank) il 19/11/2026.
create extension if not exists pg_trgm with schema extensions;
create index if not exists buildings_address_trgm_idx on public.buildings using gin (address extensions.gin_trgm_ops);
create index if not exists buildings_neighborhood_trgm_idx on public.buildings using gin (neighborhood extensions.gin_trgm_ops);
