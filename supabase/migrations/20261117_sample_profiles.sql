-- Profili di prova (dati segnaposto) per amministratori e fornitori, al posto
-- delle demo nel codice. Marcati is_sample: badge "Profilo di prova", niente
-- contatti, niente recensioni inventate (i voti arrivano solo da recensioni vere).

alter table public.administrators add column if not exists description text;
alter table public.administrators add column if not exists is_sample boolean not null default false;
alter table public.suppliers add column if not exists founded int;
alter table public.suppliers add column if not exists perks text[] not null default '{}';
alter table public.suppliers add column if not exists services text[] not null default '{}';
alter table public.suppliers add column if not exists price_from text;
alter table public.suppliers add column if not exists is_sample boolean not null default false;

create or replace view public.admin_scores as
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
    bf.avg_monthly_fee,
    a.description,
    a.is_sample
   FROM administrators a
     LEFT JOIN admin_reviews ar ON ar.administrator_id = a.id AND ar.is_published = true
     LEFT JOIN ( SELECT buildings.administrator_id, count(*) AS building_count, round(avg(buildings.monthly_fee), 0) AS avg_monthly_fee
           FROM buildings GROUP BY buildings.administrator_id) bf ON bf.administrator_id = a.id
  GROUP BY a.id, bf.building_count, bf.avg_monthly_fee;

drop function if exists public.public_suppliers();
create function public.public_suppliers()
returns table (id uuid, company_name text, categories text[], zones text[], description text, verified boolean,
               jobs int, condos int, created_at timestamptz, founded int, perks text[], services text[], price_from text, is_sample boolean)
language sql stable security definer set search_path = public as $$
  select s.id, s.company_name, s.categories, s.zones, s.description, s.verified,
         (select count(*)::int from condo_interventions i join condo_maintainers m on m.id = i.maintainer_id
           where m.supplier_user_id = s.id and i.status = 'done'),
         (select count(distinct m.building_id)::int from condo_maintainers m where m.supplier_user_id = s.id),
         s.created_at, s.founded, s.perks, s.services, s.price_from, s.is_sample
    from suppliers s
   where not exists (select 1 from profiles p where p.id = s.id and p.role = 'admin')
   order by s.is_sample, s.verified desc, s.company_name
$$;
grant execute on function public.public_suppliers() to anon, authenticated;

-- Amministratori di prova: i tre già presenti, completati con dati segnaposto
update public.administrators set is_sample = true, phone = null, email = null,
  studio_name = 'Studio Rossi Amministrazioni', address = 'Via Padova 10', active_since = 2006, verified = true,
  description = 'Profilo di prova con dati segnaposto. Studio di amministrazione condominiale a Milano: rendiconto online, assemblee anche in videochiamata e un referente per ogni condominio.'
 where id = '11111111-0000-0000-0000-000000000001';
update public.administrators set is_sample = true, phone = null, email = null,
  studio_name = 'Amministrazioni Bianchi', address = 'Corso Buenos Aires 40', active_since = 2015, verified = true,
  description = 'Profilo di prova con dati segnaposto. Amministrazione condominiale tra NoLo e Loreto, con preventivi comparati per i lavori e archivio documenti condiviso con i residenti.'
 where id = '11111111-0000-0000-0000-000000000002';
update public.administrators set is_sample = true, phone = null, email = null,
  studio_name = 'Domus Gestioni', address = 'Viale Monza 9', active_since = 2021, verified = false,
  description = 'Profilo di prova con dati segnaposto. Amministratore indipendente che segue piccoli condomini con meno di 20 unità.'
 where id = '11111111-0000-0000-0000-000000000003';

-- Fornitori di prova: servono utenti tecnici (senza password, non possono accedere)
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
values
 ('33333333-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'prova-idraulica@condoreco.invalid', '{"display_name":"Idraulica Esempio"}', '{}', now(), now()),
 ('33333333-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'prova-elettrica@condoreco.invalid', '{"display_name":"Elettrica Demo"}', '{}', now(), now()),
 ('33333333-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'prova-edilizia@condoreco.invalid', '{"display_name":"Edilizia Prova"}', '{}', now(), now())
on conflict (id) do nothing;

insert into public.suppliers (id, company_name, categories, zones, description, verified, founded, perks, services, price_from, is_sample, phone, email)
values
 ('33333333-0000-0000-0000-000000000001', 'Idraulica Esempio', array['plumbing','heating'], array['Milano','Monza'],
  'Profilo di prova con dati segnaposto. Impianti idraulici e riscaldamento per condomini: perdite, autoclavi, caldaie centralizzate e contabilizzatori.',
  true, 2012, array['Urgenze 24/7','Sopralluogo gratuito','Fattura elettronica'],
  array['Perdite e infiltrazioni','Autoclave','Caldaia centralizzata','Contabilizzatori'], '60 €/h', true, null, null),
 ('33333333-0000-0000-0000-000000000002', 'Elettrica Demo', array['electrical','antenna'], array['Milano'],
  'Profilo di prova con dati segnaposto. Impianti elettrici delle parti comuni: luci delle scale, quadri elettrici, citofoni e antenna centralizzata.',
  true, 2015, array['Interventi rapidi','Certificazioni','Preventivo online'],
  array['Luci scale e androne','Quadri elettrici','Citofoni e videocitofoni','Antenna centralizzata'], '45 €/h', true, null, null),
 ('33333333-0000-0000-0000-000000000003', 'Edilizia Prova', array['building_works','drains'], array[]::text[],
  'Profilo di prova con dati segnaposto. Facciate, infiltrazioni, piccole opere murarie e spurghi, con gestione delle pratiche per i lavori condominiali.',
  false, 2008, array['Gestione pratiche','Team qualificato','Lavori condominiali'],
  array['Rifacimento facciate','Infiltrazioni','Opere murarie','Spurghi'], null, true, null, null)
on conflict (id) do update set company_name = excluded.company_name, categories = excluded.categories, zones = excluded.zones,
  description = excluded.description, verified = excluded.verified, founded = excluded.founded, perks = excluded.perks,
  services = excluded.services, price_from = excluded.price_from, is_sample = true;

-- Collega i fornitori di prova ai condomini degli amministratori di prova (tab Fornitori)
insert into public.condo_maintainers (building_id, created_by, name, company, category, supplier_user_id)
select b.id, s.id, s.company_name, s.company_name, s.categories[1], s.id
  from public.buildings b
  join public.suppliers s on (
       (b.administrator_id = '11111111-0000-0000-0000-000000000001')
    or (b.administrator_id = '11111111-0000-0000-0000-000000000002' and s.id in ('33333333-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000002'))
    or (b.administrator_id = '11111111-0000-0000-0000-000000000003' and s.id = '33333333-0000-0000-0000-000000000003'))
 where s.is_sample
   and not exists (select 1 from public.condo_maintainers m where m.building_id = b.id and m.supplier_user_id = s.id);
