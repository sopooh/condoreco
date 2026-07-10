-- Reinserisce il filtro "Spese condominiali" (esplora + amministratori).

-- Indice sulla colonna usata dal filtro (range + istogramma su /cerca e /amministratori)
create index if not exists buildings_monthly_fee_idx on public.buildings (monthly_fee);

-- admin_scores: aggiunge avg_monthly_fee (media delle quote degli edifici gestiti).
-- Pre-aggregato in subquery per evitare il fan-out del join admin_reviews × buildings
-- (altrimenti un admin con più recensioni E più edifici falserebbe la media).
drop view if exists public.admin_scores;
create view public.admin_scores as
select
  a.id, a.name, a.studio_name, a.city, a.address, a.active_since,
  round(avg(ar.score)::numeric, 1)              as score,
  round(avg(ar.score_availability)::numeric, 1) as score_availability,
  round(avg(ar.score_transparency)::numeric, 1) as score_transparency,
  round(avg(ar.score_speed)::numeric, 1)        as score_speed,
  round(avg(ar.score_assemblies)::numeric, 1)   as score_assemblies,
  round(avg(ar.score_value)::numeric, 1)        as score_value,
  count(ar.id)                                   as review_count,
  coalesce(bf.building_count, 0)                 as building_count,
  a.phone, a.email, a.verified,
  round(avg(ar.score_maintenance)::numeric, 1)  as score_maintenance,
  bf.avg_monthly_fee
from public.administrators a
left join public.admin_reviews ar on ar.administrator_id = a.id and ar.is_published = true
left join (
  select administrator_id,
         count(*) as building_count,
         round(avg(monthly_fee)::numeric, 0) as avg_monthly_fee
  from public.buildings
  group by administrator_id
) bf on bf.administrator_id = a.id
group by a.id, bf.building_count, bf.avg_monthly_fee;

grant select on public.admin_scores to anon, authenticated;
