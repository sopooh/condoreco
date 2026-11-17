-- Pulizia dei documenti di residenza abbandonati: caricati ma mai inviati
-- (app chiusa prima dell'invio) o rimasti dopo una decisione. Dopo 24 ore,
-- se nessuna richiesta in attesa li usa, vengono cancellati. Lo storage si
-- svuota solo via Storage API: ogni notte pg_cron chiama l'edge function
-- residence-docs-cleanup con un gettone monouso (niente segreti condivisi).
create extension if not exists pg_net with schema extensions;

create table if not exists public.cleanup_tokens (
  token uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);
alter table public.cleanup_tokens enable row level security; -- solo service role

-- file orfani nel bucket residence-docs (solo service role)
create or replace function public.orphan_residence_docs(p_hours integer default 24)
returns setof text language sql stable security definer set search_path = public, storage as $$
  select o.name from storage.objects o
   where o.bucket_id = 'residence-docs'
     and o.created_at < now() - make_interval(hours => p_hours)
     and not exists (select 1 from public.condo_join_requests r where r.document_path = o.name and r.status = 'pending')
   limit 500
$$;
revoke all on function public.orphan_residence_docs(integer) from public, anon, authenticated;
grant execute on function public.orphan_residence_docs(integer) to service_role;

-- usa (e brucia) un gettone valido per 10 minuti
create or replace function public.use_cleanup_token(p_token uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare n int;
begin
  delete from cleanup_tokens where token = p_token and created_at > now() - interval '10 minutes';
  get diagnostics n = row_count;
  delete from cleanup_tokens where created_at < now() - interval '1 day';
  return n = 1;
end $$;
revoke all on function public.use_cleanup_token(uuid) from public, anon, authenticated;
grant execute on function public.use_cleanup_token(uuid) to service_role;

create or replace function public.run_residence_docs_cleanup()
returns bigint language plpgsql security definer set search_path = public, extensions as $$
declare t uuid;
begin
  insert into cleanup_tokens default values returning token into t;
  return net.http_post(
    url := 'https://ragltuoxnduohyqigkcg.supabase.co/functions/v1/residence-docs-cleanup',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('token', t)
  );
end $$;
revoke all on function public.run_residence_docs_cleanup() from public, anon, authenticated;

select cron.schedule('residence_docs_cleanup', '41 3 * * *', $$select public.run_residence_docs_cleanup()$$);
