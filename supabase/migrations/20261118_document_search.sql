-- Archivio documenti: estrazione del testo e ricerca per significato.
-- Ogni documento viene diviso in pezzi (chunk) di circa 1.000 caratteri; per ogni
-- pezzo salviamo il testo, il vettore (gte-small di Supabase, 384 dimensioni,
-- gira dentro Supabase: nessun nuovo responsabile del trattamento) e l'indice
-- full-text in italiano. La ricerca combina le due cose (ricerca ibrida), perché
-- gte-small è un modello inglese e da solo è debole sui testi in italiano.
-- I pezzi ereditano la visibilità del documento: chi non può leggere il
-- documento non vede nemmeno i suoi pezzi, né nei risultati di ricerca.

create extension if not exists vector with schema extensions;

alter table public.condo_documents add column if not exists text_status text not null default 'pending'
  check (text_status in ('pending', 'processing', 'indexed', 'no_text', 'unsupported', 'error'));
alter table public.condo_documents add column if not exists text_pages int;
alter table public.condo_documents add column if not exists text_chars int;
alter table public.condo_documents add column if not exists text_error text;
alter table public.condo_documents add column if not exists indexed_at timestamptz;
alter table public.condo_documents add column if not exists index_attempts int not null default 0;
create index if not exists condo_documents_text_status_idx on public.condo_documents (text_status) where text_status in ('pending', 'processing');

create table if not exists public.condo_document_chunks (
  id bigint generated always as identity primary key,
  document_id uuid not null references public.condo_documents(id) on delete cascade,
  building_id uuid not null references public.buildings(id) on delete cascade,
  chunk_index int not null,
  page int,
  content text not null,
  embedding extensions.vector(384),
  fts tsvector generated always as (to_tsvector('italian', content)) stored,
  created_at timestamptz not null default now(),
  unique (document_id, chunk_index)
);
create index if not exists condo_document_chunks_building_idx on public.condo_document_chunks (building_id);
create index if not exists condo_document_chunks_fts_idx on public.condo_document_chunks using gin (fts);
create index if not exists condo_document_chunks_embedding_idx on public.condo_document_chunks
  using hnsw (embedding extensions.vector_cosine_ops);
create index if not exists condo_document_chunks_todo_idx on public.condo_document_chunks (document_id) where embedding is null;

alter table public.condo_document_chunks enable row level security;
revoke all on public.condo_document_chunks from anon, authenticated;
grant select on public.condo_document_chunks to authenticated;

drop policy if exists "doc chunks: read like document" on public.condo_document_chunks;
create policy "doc chunks: read like document" on public.condo_document_chunks for select to authenticated
  using (exists (select 1 from public.condo_documents d
                 where d.id = document_id
                   and public.can_read_condo_document(d.building_id, d.visibility, d.uploaded_by)));

-- Lo stato dell'indicizzazione lo scrive solo la funzione (service role):
-- gli utenti non possono modificarlo (il grant di update è già limitato a
-- title, category, doc_date, visibility).

-- Ricerca ibrida: vettori + full-text italiano, fuse con Reciprocal Rank Fusion.
-- SECURITY INVOKER: le policy RLS di documenti e pezzi valgono per chi cerca.
create or replace function public.search_condo_documents(
  p_building uuid,
  p_query text,
  p_embedding extensions.vector(384),
  p_limit int default 8
)
returns table (
  chunk_id bigint, document_id uuid, title text, category text, doc_date date,
  file_name text, page int, content text, score double precision
)
language sql stable security invoker set search_path = public, extensions as $$
  with sem as (
    select c.id, row_number() over (order by c.embedding <=> p_embedding) as r
    from condo_document_chunks c
    where c.building_id = p_building and c.embedding is not null and p_embedding is not null
    order by c.embedding <=> p_embedding
    limit 40
  ),
  kw as (
    select c.id, row_number() over (order by ts_rank_cd(c.fts, q) desc) as r
    from condo_document_chunks c, websearch_to_tsquery('italian', coalesce(p_query, '')) q
    where c.building_id = p_building and c.fts @@ q
    order by ts_rank_cd(c.fts, q) desc
    limit 40
  ),
  fused as (
    select coalesce(sem.id, kw.id) as id,
           coalesce(1.0 / (60 + sem.r), 0) + coalesce(1.0 / (60 + kw.r), 0) as score
    from sem full outer join kw on kw.id = sem.id
  )
  select c.id, d.id, d.title, d.category, d.doc_date, d.file_name, c.page, c.content, f.score::double precision
  from fused f
  join condo_document_chunks c on c.id = f.id
  join condo_documents d on d.id = c.document_id
  order by f.score desc
  limit least(greatest(coalesce(p_limit, 8), 1), 20)
$$;
revoke all on function public.search_condo_documents(uuid, text, extensions.vector, int) from public, anon;
grant execute on function public.search_condo_documents(uuid, text, extensions.vector, int) to authenticated;

-- Rimettere in coda un documento (es. dopo un errore): chi l'ha caricato o l'admin.
create or replace function public.reindex_condo_document(p_document uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update condo_documents
     set text_status = 'pending', text_error = null, index_attempts = 0
   where id = p_document
     and (uploaded_by = auth.uid() or public.is_condo_admin(building_id));
  if not found then
    raise exception 'not allowed' using errcode = '42501';
  end if;
end $$;
revoke all on function public.reindex_condo_document(uuid) from public, anon;
grant execute on function public.reindex_condo_document(uuid) to authenticated;

-- Passaggio periodico: completa i documenti in coda e i vettori mancanti
-- (la funzione lavora a lotti per stare nei limiti di CPU delle edge function).
create or replace function public.run_document_indexing()
returns bigint language plpgsql security definer set search_path = public, extensions as $$
declare t uuid;
begin
  if not exists (select 1 from condo_documents where text_status in ('pending', 'processing') and index_attempts < 5) then
    return null;
  end if;
  insert into cleanup_tokens default values returning token into t;
  return net.http_post(
    url := 'https://ragltuoxnduohyqigkcg.supabase.co/functions/v1/document-index',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('token', t),
    timeout_milliseconds := 60000
  );
end $$;
revoke all on function public.run_document_indexing() from public, anon, authenticated;

select cron.unschedule('document_indexing') where exists (select 1 from cron.job where jobname = 'document_indexing');
select cron.schedule('document_indexing', '*/5 * * * *', $$select public.run_document_indexing()$$);
