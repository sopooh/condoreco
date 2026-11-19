-- "Chi è il vostro amministratore?" nella recensione palazzo.
alter table public.reviews
  add column if not exists reported_administrator_id uuid references public.administrators(id) on delete set null,
  add column if not exists reported_administrator_name text check (reported_administrator_name is null or char_length(reported_administrator_name) <= 120);

create index if not exists reviews_reported_admin_idx on public.reviews(reported_administrator_id) where reported_administrator_id is not null;

-- Collega studio e palazzo dalla risposta. Non sovrascrive mai un amministratore già collegato.
create or replace function public.link_building_admin_from_review()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_admin uuid;
begin
  if new.building_id is null then return new; end if;
  if new.reported_administrator_id is not null then
    select id into v_admin from administrators where id = new.reported_administrator_id and coalesce(is_sample, false) = false;
  end if;
  if v_admin is not null then
    update buildings set administrator_id = v_admin, administrator_name_pending = null
      where id = new.building_id and administrator_id is null;
  elsif nullif(btrim(new.reported_administrator_name), '') is not null then
    update buildings set administrator_name_pending = left(btrim(new.reported_administrator_name), 120)
      where id = new.building_id and administrator_id is null and administrator_name_pending is null;
  end if;
  return new;
end $$;
revoke all on function public.link_building_admin_from_review() from public, anon, authenticated;

drop trigger if exists trg_link_building_admin on public.reviews;
create trigger trg_link_building_admin after insert on public.reviews
  for each row execute function public.link_building_admin_from_review();
