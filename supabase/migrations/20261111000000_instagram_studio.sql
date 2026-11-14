-- Instagram studio: carousel drafts, slides, publishing credentials.
-- Everything is admin-only (public.is_admin()). The storage bucket is public
-- on purpose: the Instagram API downloads each slide from its public URL.

create table if not exists public.ig_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  caption text not null default '',
  status text not null default 'draft'
    check (status in ('draft', 'publishing', 'published', 'failed')),
  ig_container_id text,
  ig_media_id text,
  permalink text,
  error text,
  published_at timestamptz,
  boost jsonb,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ig_slides (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.ig_posts(id) on delete cascade,
  position integer not null default 0,
  source text not null check (source in ('upload', 'generated')),
  template text,
  params jsonb,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index if not exists ig_slides_post_position_idx on public.ig_slides (post_id, position);
create index if not exists ig_posts_created_at_idx on public.ig_posts (created_at desc);

drop trigger if exists ig_posts_set_updated_at on public.ig_posts;
create trigger ig_posts_set_updated_at
  before update on public.ig_posts
  for each row execute function public.set_updated_at();

alter table public.ig_posts enable row level security;
alter table public.ig_slides enable row level security;

drop policy if exists "ig_posts admin all" on public.ig_posts;
create policy "ig_posts admin all" on public.ig_posts
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "ig_slides admin all" on public.ig_slides;
create policy "ig_slides admin all" on public.ig_slides
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Credentials: single row, RLS on with NO policies, so only the two
-- SECURITY DEFINER functions below (admin-checked) can touch it.
create table if not exists public.ig_credentials (
  id integer primary key default 1 check (id = 1),
  ig_user_id text not null,
  username text,
  access_token text not null,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.ig_credentials enable row level security;

create or replace function public.ig_get_credentials()
returns table (ig_user_id text, username text, access_token text, expires_at timestamptz)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;
  return query select c.ig_user_id, c.username, c.access_token, c.expires_at
    from public.ig_credentials c where c.id = 1;
end;
$$;

create or replace function public.ig_save_credentials(
  p_ig_user_id text, p_username text, p_access_token text, p_expires_at timestamptz
) returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;
  insert into public.ig_credentials (id, ig_user_id, username, access_token, expires_at, updated_at)
  values (1, p_ig_user_id, p_username, p_access_token, p_expires_at, now())
  on conflict (id) do update set
    ig_user_id = excluded.ig_user_id,
    username = excluded.username,
    access_token = excluded.access_token,
    expires_at = excluded.expires_at,
    updated_at = now();
end;
$$;

revoke all on function public.ig_get_credentials() from public, anon;
revoke all on function public.ig_save_credentials(text, text, text, timestamptz) from public, anon;
grant execute on function public.ig_get_credentials() to authenticated;
grant execute on function public.ig_save_credentials(text, text, text, timestamptz) to authenticated;

-- Storage bucket for slides (JPEG only, max 8 MB as per Instagram limits).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('instagram', 'instagram', true, 8388608, array['image/jpeg'])
on conflict (id) do update set
  public = true, file_size_limit = 8388608, allowed_mime_types = array['image/jpeg'];

drop policy if exists "instagram admin insert" on storage.objects;
create policy "instagram admin insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'instagram' and public.is_admin());

drop policy if exists "instagram admin update" on storage.objects;
create policy "instagram admin update" on storage.objects
  for update to authenticated
  using (bucket_id = 'instagram' and public.is_admin());

drop policy if exists "instagram admin delete" on storage.objects;
create policy "instagram admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'instagram' and public.is_admin());
