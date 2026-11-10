-- Archivio documenti del condominio.
-- File nel bucket privato condo-documents, percorso {building_id}/{uuid}-{nome}.
-- Visibilità: 'shared' (tutti i residenti verificati) o 'restricted' (solo chi
-- l'ha caricato e gli amministratori del condominio).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('condo-documents', 'condo-documents', false, 20971520,
  array['application/pdf','image/jpeg','image/png','image/webp','image/heic',
        'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.condo_documents (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id) on delete cascade,
  uploaded_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category text not null check (category in (
    'assemblies', 'notices', 'cadastral', 'work_reports', 'budgets',
    'regulations', 'maintenance', 'contracts', 'other')),
  title text not null check (char_length(title) between 2 and 160),
  doc_date date,
  visibility text not null default 'shared' check (visibility in ('shared', 'restricted')),
  file_path text not null unique,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);
create index if not exists condo_documents_building_idx on public.condo_documents (building_id, created_at desc);
alter table public.condo_documents enable row level security;

create or replace function public.can_read_condo_document(p_building uuid, p_visibility text, p_uploader uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_member(p_building)
     and (p_visibility = 'shared' or p_uploader = auth.uid() or public.is_condo_admin(p_building))
$$;
revoke all on function public.can_read_condo_document(uuid, text, uuid) from public, anon;
grant execute on function public.can_read_condo_document(uuid, text, uuid) to authenticated;

drop policy if exists "docs: read" on public.condo_documents;
create policy "docs: read" on public.condo_documents for select to authenticated
  using (public.can_read_condo_document(building_id, visibility, uploaded_by));

drop policy if exists "docs: insert" on public.condo_documents;
create policy "docs: insert" on public.condo_documents for insert to authenticated
  with check (uploaded_by = auth.uid() and public.is_member(building_id)
              and split_part(file_path, '/', 1) = building_id::text);

drop policy if exists "docs: update own or admin" on public.condo_documents;
create policy "docs: update own or admin" on public.condo_documents for update to authenticated
  using (uploaded_by = auth.uid() or public.is_condo_admin(building_id))
  with check (uploaded_by = auth.uid() or public.is_condo_admin(building_id));

drop policy if exists "docs: delete own or admin" on public.condo_documents;
create policy "docs: delete own or admin" on public.condo_documents for delete to authenticated
  using (uploaded_by = auth.uid() or public.is_condo_admin(building_id));

revoke all on public.condo_documents from anon;
revoke update on public.condo_documents from authenticated;
grant select, insert, delete on public.condo_documents to authenticated;
grant update (title, category, doc_date, visibility) on public.condo_documents to authenticated;

-- Storage: upload nella cartella del proprio condominio, lettura secondo la
-- riga in condo_documents, cancellazione da parte di chi l'ha caricato o admin.
drop policy if exists "condo_docs: upload" on storage.objects;
create policy "condo_docs: upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'condo-documents'
              and public.is_member(((storage.foldername(name))[1])::uuid));

drop policy if exists "condo_docs: read" on storage.objects;
create policy "condo_docs: read" on storage.objects for select to authenticated
  using (bucket_id = 'condo-documents' and (
    owner = auth.uid()
    or exists (select 1 from public.condo_documents d
               where d.file_path = storage.objects.name
                 and public.can_read_condo_document(d.building_id, d.visibility, d.uploaded_by))));

drop policy if exists "condo_docs: delete" on storage.objects;
create policy "condo_docs: delete" on storage.objects for delete to authenticated
  using (bucket_id = 'condo-documents' and (
    owner = auth.uid()
    or exists (select 1 from public.condo_documents d
               where d.file_path = storage.objects.name and public.is_condo_admin(d.building_id))));
