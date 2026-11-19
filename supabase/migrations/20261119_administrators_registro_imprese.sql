-- Studi di amministrazione importati dal Registro Imprese (elenco indirizzi,
-- Comune di Milano, ATECO 68.32.01, acquistato il 19/11/2026). Già applicata
-- su Supabase (progetto condorank). I 757 studi sono stati inseriti con
-- source = 'registro_imprese_mi' e import_rank 1/2/3; esclusi affitti brevi,
-- immobiliari/investimento e imprese in liquidazione.
alter table public.administrators add column if not exists source text;
alter table public.administrators add column if not exists source_id text;
alter table public.administrators add column if not exists postal_code text;
-- 1 = quasi certamente amministratore, 2 = ditta individuale, 3 = da verificare; null = inserito da utenti/studi
alter table public.administrators add column if not exists import_rank smallint;
alter table public.administrators drop constraint if exists administrators_source_key;
alter table public.administrators add constraint administrators_source_key unique (source, source_id);

create or replace view public.admin_scores as
 SELECT a.id, a.name, a.studio_name, a.city, a.address, a.active_since,
    round(avg(ar.score), 1) AS score,
    round(avg(ar.score_availability), 1) AS score_availability,
    round(avg(ar.score_transparency), 1) AS score_transparency,
    round(avg(ar.score_speed), 1) AS score_speed,
    round(avg(ar.score_assemblies), 1) AS score_assemblies,
    round(avg(ar.score_value), 1) AS score_value,
    count(ar.id) AS review_count,
    COALESCE(bf.building_count, 0::bigint) AS building_count,
    a.phone, a.email, a.verified,
    round(avg(ar.score_maintenance), 1) AS score_maintenance,
    bf.avg_monthly_fee, a.description, a.is_sample, a.source, a.import_rank
   FROM administrators a
     LEFT JOIN admin_reviews ar ON ar.administrator_id = a.id AND ar.is_published = true
     LEFT JOIN ( SELECT buildings.administrator_id, count(*) AS building_count,
            round(avg(buildings.monthly_fee), 0) AS avg_monthly_fee
           FROM buildings GROUP BY buildings.administrator_id) bf ON bf.administrator_id = a.id
  GROUP BY a.id, bf.building_count, bf.avg_monthly_fee;
