-- "Chiedi ai residenti" / "Possibili nuovi vicini" con Condor.
-- Chi cerca casa fa una domanda su un edificio; la vedono solo i residenti
-- (condo_members con ruolo resident, mai l'amministratore). Le risposte utili
-- finiscono nella memoria del condominio (building_knowledge), che Condor usa
-- per rispondere alle domande simili. Le conversazioni restano private:
-- tutte le tabelle hanno RLS senza policy e si usano solo tramite le RPC sotto.
-- Gli embedding (gte-small, 384 dimensioni) li calcola la edge function
-- neighbour-ask; la RPC nq_ask è chiamabile solo con la service role.

create extension if not exists vector with schema extensions;

alter table public.condo_members add column if not exists nq_notify boolean not null default true;

create table if not exists public.building_questions (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id) on delete cascade,
  asker_id uuid not null references auth.users(id) on delete cascade,
  question_text text not null check (char_length(question_text) between 8 and 500),
  category text,
  embedding extensions.vector(384),
  status text not null default 'pending'
    check (status in ('pending', 'answered_resident', 'answered_condor', 'update_requested', 'archived')),
  suggested_knowledge uuid[] not null default '{}',
  asker_unread boolean not null default false,
  reported boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists building_questions_building_idx on public.building_questions(building_id, status, updated_at desc);
create index if not exists building_questions_asker_idx on public.building_questions(asker_id, created_at desc);

create table if not exists public.building_question_messages (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.building_questions(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  author_type text not null check (author_type in ('asker', 'resident', 'condor')),
  body text not null check (char_length(body) between 1 and 2000),
  knowledge_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists building_question_messages_q_idx on public.building_question_messages(question_id, created_at);

create table if not exists public.building_knowledge (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id) on delete cascade,
  category text,
  canonical_question text not null,
  summarized_answer text not null check (char_length(summarized_answer) between 3 and 1200),
  embedding extensions.vector(384),
  kind text not null default 'experience' check (kind in ('experience', 'fact')),
  confirmations_count integer not null default 1,
  contradictions_count integer not null default 0,
  status text not null default 'active' check (status in ('active', 'outdated', 'removed')),
  replaced_by uuid references public.building_knowledge(id) on delete set null,
  source_question_id uuid references public.building_questions(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null, -- interno, mai esposto
  last_verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists building_knowledge_building_idx on public.building_knowledge(building_id, status);

create table if not exists public.building_knowledge_confirmations (
  id uuid primary key default gen_random_uuid(),
  knowledge_id uuid not null references public.building_knowledge(id) on delete cascade,
  resident_id uuid references auth.users(id) on delete set null,
  confirmation_type text not null check (confirmation_type in ('confirm', 'changed', 'add')),
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.building_question_reports (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.building_questions(id) on delete cascade,
  reporter_id uuid references auth.users(id) on delete set null,
  reason text,
  created_at timestamptz not null default now(),
  unique (question_id, reporter_id)
);

create table if not exists public.question_blocks (
  user_id uuid not null references auth.users(id) on delete cascade,
  building_id uuid references public.buildings(id) on delete cascade, -- null = blocco su tutto il sito
  reason text,
  created_at timestamptz not null default now()
);
create unique index if not exists question_blocks_uniq on public.question_blocks(user_id, coalesce(building_id, '00000000-0000-0000-0000-000000000000'::uuid));

alter table public.building_questions enable row level security;
alter table public.building_question_messages enable row level security;
alter table public.building_knowledge enable row level security;
alter table public.building_knowledge_confirmations enable row level security;
alter table public.building_question_reports enable row level security;
alter table public.question_blocks enable row level security;

-- ───────── helper ─────────

-- residente del condominio (l'amministratore è escluso per ruolo)
create or replace function public.is_building_resident(p_building uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from condo_members where building_id = p_building and user_id = p_user and role = 'resident')
$$;

-- argomento della domanda da parole chiave (senza accenti, minuscolo)
create or replace function public.nq_category(p_text text)
returns text language sql stable set search_path = public as $$
  with t as (select ' ' || lower(public.unaccent(coalesce(p_text, ''))) || ' ' as s)
  select case
    when s ~ '\m(rumor|sent[eoi]|isolament|insonoriz|parete|pareti|sottil|acustic|calpest|tacchi)' then 'rumore'
    when s ~ '\m(tranquill|notte|movida|silenzi|caos|festa|feste|schiamazz)' then 'tranquillita'
    when s ~ '\m(riscald|caldaia|termosifon|freddo|caldo|teleriscald|calorifer|temperatura)' then 'riscaldamento'
    when s ~ '\m(spes[ae]|cost[oi]|quot[ae]|millesim|rate|bollett|pag[ao])' then 'spese'
    when s ~ '\m(amministrator|gestion|assemble|riunion)' then 'gestione'
    when s ~ '\m(manutenz|ascensor|guast|ripar|lavor|infiltraz|umidit|muff|tetto|facciat)' then 'manutenzione'
    when s ~ '\m(pulizi|pulit|sporc|scale|androne|cortil|giardin|spazi comuni|portineri|portier|custode)' then 'spazi_comuni'
    when s ~ '\m(sicur|furt|ladr|portone|citofon|telecamer|allarm)' then 'sicurezza'
    when s ~ '\m(vicin[io]|condomin[io] (sono|e)|gente|famigli|anzian|student|ambiente)' then 'vicinato'
    when s ~ '\m(parchegg|box|garage|cantin|bici|auto)' then 'parcheggi'
    when s ~ '\m(animal|cane|cani|gatt)' then 'animali'
    when s ~ '\m(internet|fibra|wifi|connession|antenna|parabol)' then 'connessione'
    when s ~ '\m(mezzi|metro|tram|autobus|negoz|supermercat|quartier|zona|servizi)' then 'zona'
    else null end
  from t
$$;

-- toglie dati personali dal testo che va in memoria (email, telefoni, link, interno)
create or replace function public.nq_sanitize(p_text text)
returns text language sql immutable set search_path = public as $$
  select btrim(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
    coalesce(p_text, ''),
    '[[:alnum:]._%+-]+@[[:alnum:].-]+\.[[:alpha:]]{2,}', '[email rimossa]', 'g'),
    '(\+?\d[\d .-]{7,}\d)', '[numero rimosso]', 'g'),
    'https?://\S+|www\.\S+', '[link rimosso]', 'gi'),
    '\m(interno|int\.)\s*\d+[a-z]?', '[interno rimosso]', 'gi'))
$$;

create or replace function public.nq_spam_reason(p_text text)
returns text language sql stable set search_path = public as $$
  select case
    when char_length(btrim(coalesce(p_text, ''))) < 8 then 'La domanda è troppo corta.'
    when char_length(p_text) > 500 then 'La domanda è troppo lunga (massimo 500 caratteri).'
    when p_text ~* '(https?://|www\.|\.com\M|\.it\M)' then 'Non sono ammessi link nelle domande.'
    when p_text ~* '[[:alnum:]._%+-]+@[[:alnum:].-]+\.[[:alpha:]]{2,}' then 'Non inserire indirizzi email nelle domande.'
    when lower(public.unaccent(p_text)) ~ '\m(cazz|stronz|vaffanc|merd|troi|puttan|coglion|bastard|frocio|negro)' then 'La domanda contiene parole non ammesse.'
    when p_text ~ '(.)\1{7,}' then 'La domanda non sembra valida.'
    else null end
$$;

-- testo della risposta di Condor a partire dalle voci di memoria
create or replace function public.nq_condor_text(p_ids uuid[])
returns text language plpgsql stable set search_path = public as $$
declare v_rows record; v_n int; v_txt text; v_parts text[] := '{}'; v_conf int := 0; v_last timestamptz;
begin
  select count(*) into v_n from building_knowledge where id = any(p_ids);
  if v_n = 0 then return null; end if;
  for v_rows in select * from building_knowledge where id = any(p_ids) order by confirmations_count desc, last_verified_at desc loop
    v_parts := v_parts || ('«' || v_rows.summarized_answer || '»');
    v_conf := v_conf + v_rows.confirmations_count;
    v_last := greatest(coalesce(v_last, v_rows.last_verified_at), v_rows.last_verified_at);
  end loop;
  if v_n = 1 then
    v_txt := 'Ciao! Questa domanda è già stata affrontata dai residenti.' || E'\n\n' ||
             'Secondo le esperienze condivise: ' || v_parts[1];
  else
    v_txt := 'Ciao! Su questo argomento le esperienze dei residenti sono diverse.' || E'\n\n' ||
             'Un residente racconta: ' || v_parts[1] || E'\n' || 'Un altro racconta: ' || v_parts[2];
  end if;
  v_txt := v_txt || E'\n\n' ||
    case when v_conf >= 2 then 'Confermato da ' || v_conf || ' residenti' else 'È l''esperienza di un residente, non un dato verificato' end ||
    ', ultimo aggiornamento ' || to_char(v_last at time zone 'Europe/Rome', 'MM/YYYY') || '.' || E'\n\n' ||
    'Vuoi chiedere ulteriori dettagli agli abitanti?';
  return v_txt;
end $$;

-- voci di memoria simili: stessa categoria e somiglianza alta, oppure somiglianza molto alta
create or replace function public.nq_matches(p_building uuid, p_embedding extensions.vector, p_category text, p_min numeric)
returns table (id uuid, similarity numeric, status text, last_verified_at timestamptz)
language sql stable security definer set search_path = public, extensions as $$
  select k.id, (1 - (k.embedding <=> p_embedding))::numeric, k.status, k.last_verified_at
    from building_knowledge k
   where k.building_id = p_building and k.status in ('active', 'outdated') and k.embedding is not null
     and (
       ((k.category is not distinct from p_category) and p_category is not null and 1 - (k.embedding <=> p_embedding) >= p_min)
       or 1 - (k.embedding <=> p_embedding) >= greatest(p_min + 0.08, 0.92)
     )
   order by k.embedding <=> p_embedding
   limit 4
$$;

create or replace function public.nq_notify_residents(p_question uuid)
returns void language sql security definer set search_path = public as $$
  insert into notifications (user_id, building_id, kind, title, body, link)
  select m.user_id, q.building_id, 'neighbour_question',
         'Un possibile nuovo vicino ha una domanda',
         left(q.question_text, 140),
         '/edificio/' || q.building_id || '/condominio/chat?c=vicini&q=' || q.id
    from building_questions q
    join condo_members m on m.building_id = q.building_id and m.role = 'resident' and m.nq_notify
   where q.id = p_question and m.user_id <> q.asker_id
$$;

create or replace function public.nq_notify_asker(p_question uuid, p_title text)
returns void language sql security definer set search_path = public as $$
  update building_questions set asker_unread = true where id = p_question;
  insert into notifications (user_id, building_id, kind, title, body, link)
  select q.asker_id, q.building_id, 'neighbour_answer', p_title, left(q.question_text, 140),
         '/edificio/' || q.building_id || '?chiedi=' || q.id || '#chiedi-ai-residenti'
    from building_questions q where q.id = p_question;
$$;

-- ───────── chi cerca casa ─────────

-- chiamata solo dalla edge function neighbour-ask (service role), che passa utente ed embedding
create or replace function public.nq_ask(p_user uuid, p_building uuid, p_text text, p_embedding extensions.vector)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare v_spam text; v_cat text; v_id uuid; v_auto uuid[]; v_sugg uuid[]; v_txt text; v_recent int;
begin
  if p_user is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  if not exists (select 1 from auth.users where id = p_user and email_confirmed_at is not null) then
    return json_build_object('error', 'Conferma prima il tuo indirizzo email: trovi il link nella posta.');
  end if;
  if exists (select 1 from question_blocks where user_id = p_user and (building_id is null or building_id = p_building)) then
    return json_build_object('error', 'Non puoi più inviare domande su questo condominio.');
  end if;
  if exists (select 1 from condo_members where building_id = p_building and user_id = p_user) then
    return json_build_object('error', 'Fai già parte di questo condominio: scrivi nella chat del condominio.');
  end if;
  v_spam := nq_spam_reason(p_text);
  if v_spam is not null then return json_build_object('error', v_spam); end if;
  select count(*) into v_recent from building_questions where asker_id = p_user and building_id = p_building and created_at > now() - interval '24 hours';
  if v_recent >= 3 then return json_build_object('error', 'Hai già fatto 3 domande su questo condominio oggi. Riprova domani.'); end if;
  select count(*) into v_recent from building_questions where asker_id = p_user and created_at > now() - interval '24 hours';
  if v_recent >= 10 then return json_build_object('error', 'Hai raggiunto il limite di domande per oggi. Riprova domani.'); end if;
  if exists (select 1 from building_questions where asker_id = p_user and building_id = p_building
              and lower(btrim(question_text)) = lower(btrim(p_text)) and created_at > now() - interval '7 days') then
    return json_build_object('error', 'Hai già inviato questa domanda: trovi le risposte qui sotto.');
  end if;

  perform nq_auto_archive();
  v_cat := nq_category(p_text);
  -- risposta automatica: voci attive verificate negli ultimi 18 mesi e molto simili
  select coalesce(array_agg(m.id), '{}') into v_auto
    from nq_matches(p_building, p_embedding, v_cat, 0.84) m
   where m.status = 'active' and m.last_verified_at > now() - interval '18 months';
  v_auto := v_auto[1:2];
  -- suggerimenti per i residenti (anche voci vecchie o meno simili)
  select coalesce(array_agg(m.id), '{}') into v_sugg from nq_matches(p_building, p_embedding, v_cat, 0.78) m;
  v_sugg := v_sugg[1:2];

  insert into building_questions (building_id, asker_id, question_text, category, embedding, status, suggested_knowledge)
  values (p_building, p_user, btrim(p_text), v_cat, p_embedding,
          case when cardinality(v_auto) > 0 then 'answered_condor' else 'pending' end, v_sugg)
  returning id into v_id;
  insert into building_question_messages (question_id, author_id, author_type, body)
  values (v_id, p_user, 'asker', btrim(p_text));

  if cardinality(v_auto) > 0 then
    v_txt := nq_condor_text(v_auto);
    insert into building_question_messages (question_id, author_type, body, knowledge_ids) values (v_id, 'condor', v_txt, v_auto);
    return json_build_object('id', v_id, 'status', 'answered_condor');
  end if;
  perform nq_notify_residents(v_id);
  return json_build_object('id', v_id, 'status', 'pending');
end $$;

-- le mie domande su un edificio, con i messaggi (identità dei residenti mai esposta)
create or replace function public.nq_my_questions(p_building uuid)
returns json language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(x order by x.updated_at desc), '[]'::json) from (
    select q.id, q.question_text, q.status, q.created_at, q.updated_at, q.asker_unread,
           (select json_agg(json_build_object(
              'id', m.id, 'author', m.author_type, 'body', m.body, 'created_at', m.created_at,
              'label', case m.author_type when 'resident' then 'Residente verificato' when 'condor' then 'Condor' else 'Tu' end
            ) order by m.created_at) from building_question_messages m where m.question_id = q.id) as messages
      from building_questions q
     where q.building_id = p_building and q.asker_id = auth.uid()
  ) x
$$;

create or replace function public.nq_mark_read(p_building uuid)
returns void language sql security definer set search_path = public as $$
  update building_questions set asker_unread = false where building_id = p_building and asker_id = auth.uid() and asker_unread
$$;

-- domanda di approfondimento o "Sì, chiedi ai residenti"
create or replace function public.nq_followup(p_question uuid, p_text text)
returns void language plpgsql security definer set search_path = public as $$
declare v_q building_questions; v_spam text; v_n int;
begin
  select * into v_q from building_questions where id = p_question and asker_id = auth.uid();
  if v_q.id is null then raise exception 'Domanda non trovata' using errcode = 'P0002'; end if;
  if v_q.reported then raise exception 'Questa conversazione è stata chiusa.' using errcode = '42501'; end if;
  if exists (select 1 from question_blocks where user_id = auth.uid() and (building_id is null or building_id = v_q.building_id)) then
    raise exception 'Non puoi più scrivere su questo condominio.' using errcode = '42501';
  end if;
  if p_text is not null then
    v_spam := nq_spam_reason(p_text);
    if v_spam is not null then raise exception '%', v_spam using errcode = '22023'; end if;
    select count(*) into v_n from building_question_messages where question_id = p_question and author_type = 'asker' and created_at > now() - interval '24 hours';
    if v_n >= 6 then raise exception 'Troppi messaggi oggi su questa domanda. Riprova domani.' using errcode = '22023'; end if;
    insert into building_question_messages (question_id, author_id, author_type, body) values (p_question, auth.uid(), 'asker', btrim(p_text));
  end if;
  update building_questions set status = 'update_requested', updated_at = now() where id = p_question;
  perform nq_notify_residents(p_question);
end $$;

-- "No, grazie": chiude la domanda
create or replace function public.nq_close(p_question uuid)
returns void language sql security definer set search_path = public as $$
  update building_questions set status = 'archived', updated_at = now() where id = p_question and asker_id = auth.uid()
$$;

-- ───────── residenti ─────────

create or replace function public.nq_resident_questions(p_building uuid)
returns json language plpgsql stable security definer set search_path = public as $$
begin
  if not is_building_resident(p_building) then raise exception 'forbidden' using errcode = '42501'; end if;
  return (
    select coalesce(json_agg(x order by x.rank, x.updated_at desc), '[]'::json) from (
      select q.id, q.question_text, q.status, q.category, q.created_at, q.updated_at,
             case when q.status in ('pending', 'update_requested') then 0 when q.status = 'archived' then 2 else 1 end as rank,
             (select json_agg(json_build_object(
                'id', m.id, 'author', m.author_type, 'body', m.body, 'created_at', m.created_at,
                'label', case m.author_type when 'asker' then 'Possibile nuovo vicino' when 'condor' then 'Condor'
                              else case when m.author_id = auth.uid() then 'Tu' else 'Residente verificato' end end
              ) order by m.created_at) from building_question_messages m where m.question_id = q.id) as messages,
             (select json_agg(json_build_object(
                'id', k.id, 'answer', k.summarized_answer, 'confirmations', k.confirmations_count,
                'contradictions', k.contradictions_count, 'outdated', k.status = 'outdated', 'last_verified_at', k.last_verified_at,
                'confirmed_by_me', exists (select 1 from building_knowledge_confirmations c where c.knowledge_id = k.id and c.resident_id = auth.uid() and c.confirmation_type = 'confirm')
              )) from building_knowledge k where k.id = any(q.suggested_knowledge) and k.status <> 'removed') as suggestions,
             exists (select 1 from building_question_reports r where r.question_id = q.id and r.reporter_id = auth.uid()) as reported_by_me
        from building_questions q
       where q.building_id = p_building and not q.reported
         and (q.status <> 'archived' or q.updated_at > now() - interval '60 days')
    ) x
  );
end $$;

create or replace function public.nq_pending_count(p_building uuid)
returns integer language sql stable security definer set search_path = public as $$
  select case when is_building_resident(p_building) then
    (select count(*)::int from building_questions where building_id = p_building and status in ('pending', 'update_requested') and not reported)
  else 0 end
$$;

-- risposta di un residente. p_mode: 'reply' (risposta libera), 'changed' (la situazione è cambiata),
-- 'add' (aggiungi informazioni); p_knowledge: voce di memoria di riferimento per changed/add.
create or replace function public.nq_answer(p_question uuid, p_text text, p_save boolean default true, p_mode text default 'reply', p_knowledge uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_q building_questions; v_clean text; v_k uuid; v_old building_knowledge;
begin
  select * into v_q from building_questions where id = p_question;
  if v_q.id is null or v_q.reported then raise exception 'Domanda non trovata' using errcode = 'P0002'; end if;
  if not is_building_resident(v_q.building_id) then raise exception 'Solo i residenti possono rispondere' using errcode = '42501'; end if;
  if char_length(btrim(coalesce(p_text, ''))) < 2 then raise exception 'Scrivi una risposta' using errcode = '22023'; end if;
  insert into building_question_messages (question_id, author_id, author_type, body) values (p_question, auth.uid(), 'resident', btrim(p_text));
  update building_questions set status = 'answered_resident', updated_at = now() where id = p_question;

  v_clean := left(nq_sanitize(p_text), 1200);
  if p_knowledge is not null then
    select * into v_old from building_knowledge where id = p_knowledge and building_id = v_q.building_id;
  end if;

  if p_mode = 'changed' and v_old.id is not null then
    -- la situazione è cambiata: nuova voce, la vecchia resta come storico (outdated)
    insert into building_knowledge (building_id, category, canonical_question, summarized_answer, embedding, source_question_id, created_by)
    values (v_q.building_id, coalesce(v_q.category, v_old.category), v_q.question_text, v_clean, coalesce(v_q.embedding, v_old.embedding), p_question, auth.uid())
    returning id into v_k;
    update building_knowledge set status = 'outdated', replaced_by = v_k, contradictions_count = contradictions_count + 1, updated_at = now() where id = v_old.id;
    insert into building_knowledge_confirmations (knowledge_id, resident_id, confirmation_type, note) values (v_old.id, auth.uid(), 'changed', v_clean);
  elsif p_mode = 'add' and v_old.id is not null then
    update building_knowledge set summarized_answer = left(summarized_answer || ' Inoltre: ' || v_clean, 1200),
           last_verified_at = now(), updated_at = now() where id = v_old.id;
    insert into building_knowledge_confirmations (knowledge_id, resident_id, confirmation_type, note) values (v_old.id, auth.uid(), 'add', v_clean);
  elsif p_save and v_q.embedding is not null then
    insert into building_knowledge (building_id, category, canonical_question, summarized_answer, embedding, source_question_id, created_by)
    values (v_q.building_id, v_q.category, v_q.question_text, v_clean, v_q.embedding, p_question, auth.uid());
  end if;

  perform nq_notify_asker(p_question, 'Un residente ha risposto alla tua domanda!');
end $$;

-- "Conferma risposta precedente": aggiorna la memoria e manda a chi chiede la risposta di Condor
create or replace function public.nq_confirm(p_question uuid, p_knowledge uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_q building_questions;
begin
  select * into v_q from building_questions where id = p_question;
  if v_q.id is null or v_q.reported then raise exception 'Domanda non trovata' using errcode = 'P0002'; end if;
  if not is_building_resident(v_q.building_id) then raise exception 'Solo i residenti possono confermare' using errcode = '42501'; end if;
  if not exists (select 1 from building_knowledge where id = p_knowledge and building_id = v_q.building_id and status <> 'removed') then
    raise exception 'Informazione non trovata' using errcode = 'P0002';
  end if;
  if not exists (select 1 from building_knowledge_confirmations where knowledge_id = p_knowledge and resident_id = auth.uid() and confirmation_type = 'confirm') then
    insert into building_knowledge_confirmations (knowledge_id, resident_id, confirmation_type) values (p_knowledge, auth.uid(), 'confirm');
    update building_knowledge set confirmations_count = confirmations_count + 1 where id = p_knowledge;
  end if;
  update building_knowledge set status = 'active', last_verified_at = now(), updated_at = now() where id = p_knowledge;
  insert into building_question_messages (question_id, author_type, body, knowledge_ids)
  values (p_question, 'condor', replace(nq_condor_text(array[p_knowledge]), 'Ciao! Questa domanda è già stata affrontata dai residenti.', 'Ciao! Un residente ha appena confermato quello che la community aveva già raccontato.'), array[p_knowledge]);
  update building_questions set status = 'answered_condor', updated_at = now() where id = p_question;
  perform nq_notify_asker(p_question, 'Condor ha trovato una risposta alla tua domanda.');
end $$;

-- segnalazione: la domanda sparisce per il residente; con 2 segnalazioni viene chiusa
-- e chi l'ha fatta non può più scrivere su quel condominio; con 3 condomini, su tutto il sito.
create or replace function public.nq_report(p_question uuid, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_q building_questions; v_n int;
begin
  select * into v_q from building_questions where id = p_question;
  if v_q.id is null then return; end if;
  if not is_building_resident(v_q.building_id) then raise exception 'forbidden' using errcode = '42501'; end if;
  insert into building_question_reports (question_id, reporter_id, reason) values (p_question, auth.uid(), left(p_reason, 300))
  on conflict (question_id, reporter_id) do nothing;
  select count(*) into v_n from building_question_reports where question_id = p_question;
  if v_n >= 2 then
    update building_questions set reported = true, status = 'archived', updated_at = now() where id = p_question;
    insert into question_blocks (user_id, building_id, reason) values (v_q.asker_id, v_q.building_id, 'Segnalato dai residenti')
    on conflict do nothing;
    if (select count(distinct building_id) from question_blocks where user_id = v_q.asker_id and building_id is not null) >= 3 then
      insert into question_blocks (user_id, building_id, reason) values (v_q.asker_id, null, 'Segnalato in più condomini') on conflict do nothing;
    end if;
  end if;
end $$;

create or replace function public.nq_archive(p_question uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_b uuid;
begin
  select building_id into v_b from building_questions where id = p_question;
  if v_b is null or not is_building_resident(v_b) then raise exception 'forbidden' using errcode = '42501'; end if;
  update building_questions set status = 'archived', updated_at = now() where id = p_question;
end $$;

create or replace function public.nq_set_notify(p_building uuid, p_on boolean)
returns void language sql security definer set search_path = public as $$
  update condo_members set nq_notify = p_on where building_id = p_building and user_id = auth.uid()
$$;

create or replace function public.nq_my_notify(p_building uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select nq_notify from condo_members where building_id = p_building and user_id = auth.uid()), true)
$$;

-- archiviazione automatica delle domande risolte da più di 30 giorni
create or replace function public.nq_auto_archive()
returns void language sql security definer set search_path = public as $$
  update building_questions set status = 'archived'
   where status in ('answered_resident', 'answered_condor') and updated_at < now() - interval '30 days'
$$;

-- ───────── permessi ─────────
do $$
declare f text;
begin
  foreach f in array array[
    'is_building_resident(uuid, uuid)', 'nq_category(text)', 'nq_sanitize(text)', 'nq_spam_reason(text)',
    'nq_condor_text(uuid[])', 'nq_matches(uuid, extensions.vector, text, numeric)', 'nq_notify_residents(uuid)',
    'nq_notify_asker(uuid, text)', 'nq_ask(uuid, uuid, text, extensions.vector)', 'nq_auto_archive()'
  ] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
  end loop;
  foreach f in array array[
    'nq_my_questions(uuid)', 'nq_mark_read(uuid)', 'nq_followup(uuid, text)', 'nq_close(uuid)',
    'nq_resident_questions(uuid)', 'nq_pending_count(uuid)', 'nq_answer(uuid, text, boolean, text, uuid)',
    'nq_confirm(uuid, uuid)', 'nq_report(uuid, text)', 'nq_archive(uuid)', 'nq_set_notify(uuid, boolean)', 'nq_my_notify(uuid)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
grant execute on function public.nq_ask(uuid, uuid, text, extensions.vector) to service_role;
grant execute on function public.nq_auto_archive() to service_role;
