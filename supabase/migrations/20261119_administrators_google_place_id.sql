-- Collegamento degli studi alla scheda Google Maps: si salva solo il place_id
-- (consentito dai termini Google). Già applicata su Supabase il 19/11/2026,
-- con admin_scores ricreata aggiungendo a.google_place_id in coda.
alter table public.administrators add column if not exists google_place_id text;
alter table public.administrators add column if not exists google_checked_at timestamptz;

-- admin_scores: versione veloce di 20261119_admin_scores_fast + google_place_id in coda.
create or replace view public.admin_scores with (security_invoker = on) as
 SELECT a.id, a.name, a.studio_name, a.city, a.address, a.active_since,
    round(avg(ar.score), 1) AS score,
    round(avg(ar.score_availability), 1) AS score_availability,
    round(avg(ar.score_transparency), 1) AS score_transparency,
    round(avg(ar.score_speed), 1) AS score_speed,
    round(avg(ar.score_assemblies), 1) AS score_assemblies,
    round(avg(ar.score_value), 1) AS score_value,
    count(ar.id) AS review_count,
    COALESCE(bf.building_count, (0)::bigint) AS building_count,
    a.phone, a.email, a.verified,
    round(avg(ar.score_maintenance), 1) AS score_maintenance,
    bf.avg_monthly_fee, a.description, a.is_sample, a.source, a.import_rank, a.lat, a.lng,
    a.google_place_id
   FROM administrators a
     LEFT JOIN admin_reviews ar ON ar.administrator_id = a.id AND ar.is_published = true
     LEFT JOIN ( SELECT buildings.administrator_id, count(*) AS building_count, round(avg(buildings.monthly_fee), 0) AS avg_monthly_fee
           FROM buildings WHERE buildings.administrator_id IS NOT NULL
          GROUP BY buildings.administrator_id) bf ON bf.administrator_id = a.id
  GROUP BY a.id, bf.building_count, bf.avg_monthly_fee;
