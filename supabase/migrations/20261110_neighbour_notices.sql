-- Avvisi ai vicini: un residente segnala qualcosa che riguarda chi abita a
-- un certo piano (es. porte dell'ascensore aperte) o tutto il palazzo.
-- L'avviso genera una notifica in app per ogni destinatario (e, se
-- configurato, una email tramite l'edge function notify-notice).

-- 1. Piano di ciascun residente (testo libero normalizzato: "T", "1", "-1"...)
alter table public.condo_members add column if not exists floor text;

-- 2. Avvisi
create table if not exists public.condo_notices (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade default auth.uid(),
  kind text not null default 'other'
    check (kind in ('elevator_doors', 'main_door', 'water_leak', 'noise', 'smell', 'other')),
  message text not null check (char_length(message) between 3 and 500),
  target text not null check (target in ('floor', 'building')),
  target_floor text,
  recipients_count int not null default 0,
  created_at timestamptz not null default now(),
  constraint condo_notices_floor_chk check (target = 'building' or target_floor is not null)
);
create index if not exists condo_notices_building_idx on public.condo_notices (building_id, created_at desc);
alter table public.condo_notices enable row level security;

-- il mittente vede i propri avvisi; i destinatari li leggono tramite le notifiche
drop policy if exists "notices: author reads" on public.condo_notices;
create policy "notices: author reads" on public.condo_notices
  for select to authenticated using (created_by = auth.uid());

-- 3. Notifiche personali
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  building_id uuid references public.buildings(id) on delete cascade,
  notice_id uuid references public.condo_notices(id) on delete cascade,
  kind text not null default 'notice',
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
alter table public.notifications enable row level security;

drop policy if exists "notifications: own read" on public.notifications;
create policy "notifications: own read" on public.notifications
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "notifications: own mark read" on public.notifications;
create policy "notifications: own mark read" on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "notifications: own delete" on public.notifications;
create policy "notifications: own delete" on public.notifications
  for delete to authenticated using (user_id = auth.uid());

revoke all on public.notifications from anon;
revoke all on public.condo_notices from anon;
revoke insert, update, delete on public.condo_notices from authenticated;
revoke insert, update on public.notifications from authenticated;
grant select, delete on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
grant select on public.condo_notices to authenticated;

-- 4. Invio: crea l'avviso e una notifica per ogni residente destinatario
--    (escluso il mittente). Restituisce id e numero di destinatari.
create or replace function public.send_condo_notice(
  p_building uuid, p_kind text, p_message text, p_target text, p_floor text
) returns table (notice_id uuid, recipients int)
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_n int;
  v_floor text := nullif(upper(trim(coalesce(p_floor, ''))), '');
  v_title text;
  v_recent int;
begin
  if auth.uid() is null or not public.is_member(p_building) then
    raise exception 'not a member of this building' using errcode = '42501';
  end if;
  if p_target = 'floor' and v_floor is null then
    raise exception 'floor required' using errcode = '22023';
  end if;
  -- limite anti-spam: massimo 10 avvisi l'ora per persona
  select count(*) into v_recent from condo_notices
   where created_by = auth.uid() and created_at > now() - interval '1 hour';
  if v_recent >= 10 then
    raise exception 'too many notices' using errcode = '54000';
  end if;

  insert into condo_notices (building_id, created_by, kind, message, target, target_floor)
  values (p_building, auth.uid(), p_kind, trim(p_message), p_target, case when p_target = 'floor' then v_floor end)
  returning id into v_id;

  v_title := case p_kind
    when 'elevator_doors' then 'Porte dell''ascensore aperte'
    when 'main_door' then 'Portone o cancello aperto'
    when 'water_leak' then 'Perdita d''acqua'
    when 'noise' then 'Rumori'
    when 'smell' then 'Odore di gas o di bruciato'
    else 'Avviso dai vicini' end
    || case when p_target = 'floor' then ' · ' || case when v_floor = 'T' then 'piano terra' else 'piano ' || v_floor end else '' end;

  insert into notifications (user_id, building_id, notice_id, kind, title, body, link)
  select m.user_id, p_building, v_id, 'notice', v_title, trim(p_message),
         '/edificio/' || p_building || '/condominio/bacheca'
    from condo_members m
   where m.building_id = p_building
     and m.user_id <> auth.uid()
     and (p_target = 'building' or upper(trim(m.floor)) = v_floor);
  get diagnostics v_n = row_count;

  update condo_notices set recipients_count = v_n where id = v_id;
  return query select v_id, v_n;
end $$;

revoke all on function public.send_condo_notice(uuid, text, text, text, text) from public, anon;
grant execute on function public.send_condo_notice(uuid, text, text, text, text) to authenticated;

-- 5. Quanti residenti hanno indicato il proprio piano (per mostrarlo nel form)
create or replace function public.condo_floor_counts(p_building uuid)
returns table (floor text, residents int)
language sql security definer set search_path = public stable as $$
  select upper(trim(m.floor)), count(*)::int
    from condo_members m
   where m.building_id = p_building and m.floor is not null and public.is_member(p_building)
   group by 1
$$;
revoke all on function public.condo_floor_counts(uuid) from public, anon;
grant execute on function public.condo_floor_counts(uuid) to authenticated;
alter table public.condo_notices add column if not exists emailed_at timestamptz;
