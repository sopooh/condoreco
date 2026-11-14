-- Conservazione "Chiedi ai residenti": le domande risolte vengono archiviate
-- dopo 30 giorni (nq_auto_archive) e cancellate con i messaggi circa 12 mesi
-- dopo l'archiviazione (13 mesi dall'ultima attività). Le voci della memoria
-- del condominio restano: sono anonime e source_question_id va a null.
create or replace function public.gdpr_retention_cleanup()
returns void
language plpgsql security definer set search_path = public
as $$
begin
  delete from login_events where created_at < now() - interval '12 months';
  delete from page_views where created_at < now() - interval '12 months';
  delete from notifications where read_at is not null and read_at < now() - interval '12 months';
  delete from condo_join_requests where status <> 'pending' and reviewed_at < now() - interval '12 months';
  delete from privacy_requests where status <> 'open' and handled_at < now() - interval '24 months';
  perform nq_auto_archive();
  delete from building_questions where status = 'archived' and updated_at < now() - interval '13 months';
end $$;
revoke execute on function public.gdpr_retention_cleanup() from public, anon, authenticated;
