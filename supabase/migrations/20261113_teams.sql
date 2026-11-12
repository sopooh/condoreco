-- Team con livelli (amministratore, approvatore, editor, visualizzatore) e attività
-- assegnabili. Un team per Recofixer (kind 'supplier') e uno per amministratore di
-- condominio (kind 'admin'). Il titolare è sempre membro con livello amministratore.
-- Scritture solo tramite RPC; lettura con RLS per i membri.

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('supplier', 'admin')),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (owner_id, kind)
);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  name text not null check (char_length(name) between 2 and 80),
  job text check (job is null or char_length(job) <= 60),
  phone text check (phone is null or char_length(phone) <= 30),
  role text not null default 'editor' check (role in ('admin', 'approver', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  unique (team_id, user_id)
);
create index if not exists team_members_user_idx on public.team_members(user_id);

create table if not exists public.team_invites (
  id uuid primary key default gen_random_uuid(),
  token text not null unique default encode(extensions.gen_random_bytes(18), 'hex'),
  team_id uuid not null references public.teams(id) on delete cascade,
  member_id uuid references public.team_members(id) on delete cascade,
  role text not null check (role in ('admin', 'approver', 'editor', 'viewer')),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  used_by uuid references auth.users(id) on delete set null,
  used_at timestamptz
);

create table if not exists public.team_tasks (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 140),
  description text check (description is null or char_length(description) <= 2000),
  assignee_id uuid references public.team_members(id) on delete set null,
  building_id uuid references public.buildings(id) on delete set null,
  due_date date,
  priority text not null default 'normal' check (priority in ('normal', 'high')),
  status text not null default 'todo' check (status in ('todo', 'doing', 'review', 'done')),
  review_note text check (review_note is null or char_length(review_note) <= 500),
  created_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists team_tasks_team_idx on public.team_tasks(team_id, status);

alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.team_invites enable row level security;
alter table public.team_tasks enable row level security;

-- livello dell'utente nel team: null se non ne fa parte
create or replace function public.team_role(p_team uuid)
returns text language sql stable security definer set search_path = public as $$
  select case
    when exists (select 1 from teams t where t.id = p_team and t.owner_id = auth.uid()) then 'admin'
    else (select m.role from team_members m where m.team_id = p_team and m.user_id = auth.uid())
  end
$$;

create or replace function public.team_can(p_team uuid, p_min text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (array_position(array['viewer','editor','approver','admin'], public.team_role(p_team)) >=
     array_position(array['viewer','editor','approver','admin'], p_min)), false)
$$;

drop policy if exists "teams: members read" on public.teams;
create policy "teams: members read" on public.teams for select to authenticated using (team_can(id, 'viewer'));
drop policy if exists "team_members: members read" on public.team_members;
create policy "team_members: members read" on public.team_members for select to authenticated using (team_can(team_id, 'viewer'));
drop policy if exists "team_tasks: members read" on public.team_tasks;
create policy "team_tasks: members read" on public.team_tasks for select to authenticated using (team_can(team_id, 'viewer'));
drop policy if exists "team_invites: admins read" on public.team_invites;
create policy "team_invites: admins read" on public.team_invites for select to authenticated using (team_can(team_id, 'admin'));

-- crea (se manca) il team del Recofixer o dello studio dell'amministratore
create or replace function public.ensure_my_team(p_kind text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_name text; v_me text;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  select id into v_id from teams where owner_id = auth.uid() and kind = p_kind;
  if v_id is not null then return v_id; end if;
  select coalesce(display_name, 'Titolare') into v_me from profiles where id = auth.uid();
  if p_kind = 'supplier' then
    select company_name into v_name from suppliers where id = auth.uid();
    if v_name is null then raise exception 'Serve un profilo Recofixer' using errcode = '42501'; end if;
  elsif p_kind = 'admin' then
    if not (is_admin() or exists (select 1 from condo_members where user_id = auth.uid() and role = 'admin')) then
      raise exception 'Serve essere amministratore di almeno un condominio' using errcode = '42501';
    end if;
    v_name := 'Studio di ' || coalesce(v_me, 'amministrazione');
  else
    raise exception 'tipo non valido' using errcode = '22023';
  end if;
  insert into teams (kind, owner_id, name) values (p_kind, auth.uid(), v_name) returning id into v_id;
  insert into team_members (team_id, user_id, name, role) values (v_id, auth.uid(), coalesce(v_me, 'Titolare'), 'admin');
  return v_id;
end $$;

-- i team di cui faccio parte
create or replace function public.my_teams()
returns table (id uuid, kind text, name text, owner_id uuid, is_owner boolean, my_role text, member_id uuid, open_tasks integer)
language sql stable security definer set search_path = public as $$
  select t.id, t.kind, t.name, t.owner_id, t.owner_id = auth.uid(), team_role(t.id),
         (select m.id from team_members m where m.team_id = t.id and m.user_id = auth.uid()),
         (select count(*)::int from team_tasks k where k.team_id = t.id and k.status <> 'done')
    from teams t
   where t.owner_id = auth.uid() or exists (select 1 from team_members m where m.team_id = t.id and m.user_id = auth.uid())
   order by (t.owner_id = auth.uid()) desc, t.created_at
$$;

-- aggiunge o modifica una persona (solo amministratori del team)
create or replace function public.team_save_member(p_team uuid, p_id uuid, p_name text, p_job text, p_phone text, p_role text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_owner uuid;
begin
  if not team_can(p_team, 'admin') then raise exception 'Solo gli amministratori del team possono gestire le persone' using errcode = '42501'; end if;
  select owner_id into v_owner from teams where id = p_team;
  if p_id is null then
    insert into team_members (team_id, name, job, phone, role)
    values (p_team, trim(p_name), nullif(trim(p_job), ''), nullif(trim(p_phone), ''), p_role) returning id into v_id;
  else
    update team_members set name = trim(p_name), job = nullif(trim(p_job), ''), phone = nullif(trim(p_phone), ''),
           role = case when user_id = v_owner then 'admin' else p_role end
     where id = p_id and team_id = p_team returning id into v_id;
    if v_id is null then raise exception 'Persona non trovata' using errcode = 'P0002'; end if;
  end if;
  return v_id;
end $$;

create or replace function public.team_remove_member(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_team uuid; v_user uuid;
begin
  select m.team_id, m.user_id into v_team, v_user from team_members m where m.id = p_id;
  if v_team is null then raise exception 'Persona non trovata' using errcode = 'P0002'; end if;
  if exists (select 1 from teams where id = v_team and owner_id = v_user) then
    raise exception 'Il titolare non può essere rimosso' using errcode = '42501';
  end if;
  if not (team_can(v_team, 'admin') or v_user = auth.uid()) then raise exception 'forbidden' using errcode = '42501'; end if;
  delete from team_members where id = p_id;
end $$;

-- link d'invito (7 giorni). p_member collega l'invito a una persona già in elenco senza account.
create or replace function public.team_create_invite(p_team uuid, p_role text, p_member uuid default null)
returns text language plpgsql security definer set search_path = public as $$
declare v_token text;
begin
  if not team_can(p_team, 'admin') then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_member is not null and not exists (select 1 from team_members where id = p_member and team_id = p_team and user_id is null) then
    raise exception 'Persona non valida' using errcode = 'P0002';
  end if;
  insert into team_invites (team_id, member_id, role, created_by) values (p_team, p_member, p_role, auth.uid()) returning token into v_token;
  return v_token;
end $$;

create or replace function public.team_invite_info(p_token text)
returns table (team_name text, kind text, owner_name text, role text, member_name text, valid boolean, already_member boolean)
language sql stable security definer set search_path = public as $$
  select t.name, t.kind, p.display_name, i.role, m.name,
         i.used_at is null and i.expires_at > now(),
         auth.uid() is not null and (t.owner_id = auth.uid() or exists (select 1 from team_members x where x.team_id = t.id and x.user_id = auth.uid()))
    from team_invites i join teams t on t.id = i.team_id
    left join profiles p on p.id = t.owner_id
    left join team_members m on m.id = i.member_id
   where i.token = p_token
$$;

create or replace function public.team_accept_invite(p_token text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_inv team_invites; v_name text;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  select * into v_inv from team_invites where token = p_token for update;
  if v_inv.id is null then raise exception 'Invito non trovato' using errcode = 'P0002'; end if;
  if exists (select 1 from teams where id = v_inv.team_id and owner_id = auth.uid())
     or exists (select 1 from team_members where team_id = v_inv.team_id and user_id = auth.uid()) then
    return v_inv.team_id;
  end if;
  if v_inv.used_at is not null or v_inv.expires_at <= now() then raise exception 'Invito scaduto o già usato' using errcode = '22023'; end if;
  select coalesce(display_name, 'Membro') into v_name from profiles where id = auth.uid();
  if v_inv.member_id is not null and exists (select 1 from team_members where id = v_inv.member_id and user_id is null) then
    update team_members set user_id = auth.uid(), role = v_inv.role where id = v_inv.member_id;
  else
    insert into team_members (team_id, user_id, name, role) values (v_inv.team_id, auth.uid(), coalesce(v_name, 'Membro'), v_inv.role);
  end if;
  update team_invites set used_by = auth.uid(), used_at = now() where id = v_inv.id;
  return v_inv.team_id;
end $$;

create or replace function public.team_notify(p_member uuid, p_title text, p_body text, p_link text)
returns void language sql security definer set search_path = public as $$
  insert into notifications (user_id, kind, title, body, link)
  select m.user_id, 'team_task', p_title, p_body, p_link
    from team_members m where m.id = p_member and m.user_id is not null and m.user_id <> auth.uid()
$$;

-- crea o modifica un'attività (editor in su)
create or replace function public.team_save_task(p_team uuid, p_id uuid, p_title text, p_description text, p_assignee uuid,
  p_due date, p_priority text, p_building uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_prev uuid; v_team_name text;
begin
  if not team_can(p_team, 'editor') then raise exception 'Il tuo livello permette solo di vedere' using errcode = '42501'; end if;
  if p_assignee is not null and not exists (select 1 from team_members where id = p_assignee and team_id = p_team) then
    raise exception 'Persona non nel team' using errcode = 'P0002';
  end if;
  if p_id is null then
    insert into team_tasks (team_id, title, description, assignee_id, due_date, priority, building_id, created_by)
    values (p_team, trim(p_title), nullif(trim(p_description), ''), p_assignee, p_due, coalesce(p_priority, 'normal'), p_building, auth.uid())
    returning id into v_id;
  else
    select assignee_id into v_prev from team_tasks where id = p_id and team_id = p_team;
    update team_tasks set title = trim(p_title), description = nullif(trim(p_description), ''), assignee_id = p_assignee,
           due_date = p_due, priority = coalesce(p_priority, 'normal'), building_id = p_building, updated_at = now()
     where id = p_id and team_id = p_team returning id into v_id;
    if v_id is null then raise exception 'Attività non trovata' using errcode = 'P0002'; end if;
  end if;
  if p_assignee is not null and p_assignee is distinct from v_prev then
    select name into v_team_name from teams where id = p_team;
    perform team_notify(p_assignee, 'Nuova attività per te', trim(p_title) || ' · ' || v_team_name, '/team?team=' || p_team || '&task=' || v_id);
  end if;
  return v_id;
end $$;

-- cambia stato. Editor: da fare / in corso / da approvare. Approvatore e amministratore: anche fatta e riapertura.
create or replace function public.team_set_task_status(p_id uuid, p_status text, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_task team_tasks; v_link text; m record;
begin
  select * into v_task from team_tasks where id = p_id;
  if v_task.id is null then raise exception 'Attività non trovata' using errcode = 'P0002'; end if;
  if not team_can(v_task.team_id, 'editor') then raise exception 'Il tuo livello permette solo di vedere' using errcode = '42501'; end if;
  if (p_status = 'done' or v_task.status = 'done') and not team_can(v_task.team_id, 'approver') then
    raise exception 'Serve un approvatore per chiudere o riaprire un''attività' using errcode = '42501';
  end if;
  update team_tasks set status = p_status,
         review_note = case when p_note is not null then nullif(trim(p_note), '') else review_note end,
         approved_by = case when p_status = 'done' then auth.uid() else null end,
         approved_at = case when p_status = 'done' then now() else null end,
         updated_at = now()
   where id = p_id;
  v_link := '/team?team=' || v_task.team_id || '&task=' || p_id;
  if p_status = 'review' then
    for m in select x.id from team_members x where x.team_id = v_task.team_id and x.role in ('admin', 'approver') loop
      perform team_notify(m.id, 'Attività da approvare', v_task.title, v_link);
    end loop;
  elsif p_status = 'done' and v_task.assignee_id is not null then
    perform team_notify(v_task.assignee_id, 'Attività approvata', v_task.title, v_link);
  elsif v_task.status = 'review' and p_status = 'doing' and v_task.assignee_id is not null then
    perform team_notify(v_task.assignee_id, 'Attività da rivedere', v_task.title || coalesce(' · ' || nullif(trim(p_note), ''), ''), v_link);
  end if;
end $$;

create or replace function public.team_delete_task(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_task team_tasks;
begin
  select * into v_task from team_tasks where id = p_id;
  if v_task.id is null then return; end if;
  if not (team_can(v_task.team_id, 'admin') or (team_can(v_task.team_id, 'editor') and v_task.created_by = auth.uid() and v_task.status <> 'done')) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  delete from team_tasks where id = p_id;
end $$;

-- interventi Recofixer: il tecnico assegnato ora è un membro del team del Recofixer
alter table public.condo_interventions drop constraint if exists condo_interventions_supplier_tech_id_fkey;
update public.condo_interventions set supplier_tech_id = null where supplier_tech_id is not null;
alter table public.condo_interventions add constraint condo_interventions_supplier_tech_id_fkey
  foreign key (supplier_tech_id) references public.team_members(id) on delete set null;

create or replace function public.supplier_assign_tech(p_intervention uuid, p_member uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_intervention_supplier(p_intervention) then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_member is not null and not exists (
    select 1 from team_members m join teams t on t.id = m.team_id
     where m.id = p_member and t.owner_id = auth.uid() and t.kind = 'supplier') then
    raise exception 'Tecnico non trovato' using errcode = 'P0002';
  end if;
  update condo_interventions set supplier_tech_id = p_member, updated_at = now() where id = p_intervention;
end $$;

create or replace function public.supplier_interventions()
 returns table(id uuid, ref_number integer, building_id uuid, building_address text, building_city text, lat double precision, lng double precision, title text, category text, description text, location text, status text, urgent boolean, scheduled_date date, time_start time without time zone, time_end time without time zone, proposed_date date, proposed_time_start time without time zone, proposed_time_end time without time zone, completion_notes text, completed_at timestamp with time zone, created_at timestamp with time zone, updated_at timestamp with time zone, requester text, requester_is_admin boolean, thread_id uuid, message_count integer, last_message_at timestamp with time zone, tech_id uuid, tech_name text, quote_cents bigint, quote_at timestamp with time zone, invoice_cents bigint, photo_count integer, file_count integer)
 language sql stable security definer set search_path to 'public'
as $function$
  select i.id, i.ref_number::int, i.building_id,
         b.address || coalesce(', ' || b.street_number, '') || coalesce(' · ' || b.city, ''), b.city, b.lat, b.lng,
         i.title, i.category, i.description, i.location, i.status, i.urgent,
         i.scheduled_date, i.time_start, i.time_end,
         i.proposed_date, i.proposed_time_start, i.proposed_time_end,
         i.completion_notes, i.completed_at, i.created_at, i.updated_at,
         p.display_name,
         exists (select 1 from condo_members cm where cm.building_id = i.building_id and cm.user_id = i.created_by and cm.role = 'admin'),
         t.id,
         (select count(*)::int from condo_thread_messages x where x.thread_id = t.id),
         (select max(x.created_at) from condo_thread_messages x where x.thread_id = t.id),
         i.supplier_tech_id, tm.name,
         (select f.amount_cents from condo_intervention_files f where f.intervention_id = i.id and f.kind = 'quote' order by f.created_at desc limit 1),
         (select max(f.created_at) from condo_intervention_files f where f.intervention_id = i.id and f.kind = 'quote'),
         (select f.amount_cents from condo_intervention_files f where f.intervention_id = i.id and f.kind = 'invoice' order by f.created_at desc limit 1),
         (select count(*)::int from condo_intervention_files f where f.intervention_id = i.id and f.kind = 'photo'),
         (select count(*)::int from condo_intervention_files f where f.intervention_id = i.id)
    from condo_interventions i
    join condo_maintainers m on m.id = i.maintainer_id and m.supplier_user_id = auth.uid()
    join buildings b on b.id = i.building_id
    left join profiles p on p.id = i.created_by
    left join condo_threads t on t.intervention_id = i.id
    left join team_members tm on tm.id = i.supplier_tech_id
   order by case i.status when 'requested' then 0 when 'scheduled' then 1 else 2 end, i.urgent desc, i.created_at desc
$function$;

drop table if exists public.supplier_team_members;

-- permessi
do $$
declare f text;
begin
  foreach f in array array[
    'team_role(uuid)', 'team_can(uuid, text)', 'ensure_my_team(text)', 'my_teams()',
    'team_save_member(uuid, uuid, text, text, text, text)', 'team_remove_member(uuid)',
    'team_create_invite(uuid, text, uuid)', 'team_accept_invite(text)',
    'team_save_task(uuid, uuid, text, text, uuid, date, text, uuid)', 'team_set_task_status(uuid, text, text)',
    'team_delete_task(uuid)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
revoke all on function public.team_notify(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.team_invite_info(text) from public;
grant execute on function public.team_invite_info(text) to anon, authenticated;
