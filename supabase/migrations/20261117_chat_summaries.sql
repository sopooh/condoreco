-- Ultimo riassunto di Condor per ogni chat del condominio. Se non ci sono
-- messaggi nuovi viene riusato senza chiamare l'AI (e senza consumare usi).
create table if not exists public.chat_summaries (
  building_id uuid primary key references public.buildings(id) on delete cascade,
  summary jsonb not null,
  message_count integer not null default 0,
  last_message_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.chat_summaries enable row level security; -- solo service role (edge function)
