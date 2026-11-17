-- "Elimina per me" (come WhatsApp): nasconde un messaggio solo a chi lo
-- elimina, in qualsiasi momento e in qualsiasi chat (condominio o
-- conversazioni). Gli altri continuano a vederlo.
create table if not exists public.chat_message_hides (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  message_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, message_id)
);
alter table public.chat_message_hides enable row level security;
create policy "hides: own read" on public.chat_message_hides for select using (user_id = auth.uid());
create policy "hides: own insert" on public.chat_message_hides for insert with check (user_id = auth.uid());
create policy "hides: own delete" on public.chat_message_hides for delete using (user_id = auth.uid());
grant select, insert, delete on public.chat_message_hides to authenticated;
