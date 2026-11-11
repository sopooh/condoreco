-- Amministratori salvati (segnalibro nella lista Amministratori)
create table if not exists public.saved_admins (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  administrator_id uuid not null references public.administrators(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, administrator_id)
);
alter table public.saved_admins enable row level security;
create policy "saved_admins: own read" on public.saved_admins for select to authenticated using (user_id = auth.uid());
create policy "saved_admins: own insert" on public.saved_admins for insert to authenticated with check (user_id = auth.uid());
create policy "saved_admins: own delete" on public.saved_admins for delete to authenticated using (user_id = auth.uid());
revoke all on public.saved_admins from anon;
grant select, insert, delete on public.saved_admins to authenticated;
