-- ============================================================
-- Correctif saturation base de données (bug infra email Lovable)
--
-- Le job pg_cron 'process-email-queue' tourne toutes les 5 secondes
-- (~17 280 exécutions/jour). Sans purge, cron.job_run_details (historique
-- pg_cron) et net._http_response (réponses pg_net) croissent sans limite
-- jusqu'à saturer le disque et passer la base en lecture seule.
--
-- Ce correctif :
--   1. purge l'historique existant (au cas où la purge d'urgence n'a pas
--      été faite via scripts/emergency-db-purge.sql) ;
--   2. installe des jobs de rétention récurrents ;
--   3. corrige la contrainte CHECK d'email_send_log qui rejetait
--      silencieusement le statut 'rate_limited' écrit par
--      process-email-queue.
-- ============================================================

-- 1. Purge initiale (idempotent, ignore si tables absentes ou droits insuffisants)
DO $$
BEGIN
  BEGIN
    TRUNCATE net._http_response;
  EXCEPTION WHEN undefined_table OR insufficient_privilege THEN
    BEGIN
      DELETE FROM net._http_response WHERE created < now() - interval '6 hours';
    EXCEPTION WHEN undefined_table THEN NULL;
    END;
  END;
END $$;

DO $$
BEGIN
  BEGIN
    DELETE FROM cron.job_run_details WHERE end_time < now() - interval '2 days';
  EXCEPTION WHEN undefined_table THEN NULL;
  END;
END $$;

-- 2. Jobs de rétention récurrents
-- cron.schedule avec un nom existant met à jour le job (upsert) : idempotent.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RETURN;
  END IF;

  -- Historique pg_cron : 17k lignes/jour à cause du job toutes les 5 s.
  -- Rétention 2 jours = plafond ~35k lignes.
  PERFORM cron.schedule(
    'cleanup-cron-job-run-details',
    '12 3 * * *',
    $job$DELETE FROM cron.job_run_details WHERE end_time < now() - interval '2 days'$job$
  );

  -- Réponses pg_net : le TTL natif de pg_net (6 h) n'est pas fiable sous
  -- charge ; ce filet de sécurité horaire garantit un plafond.
  PERFORM cron.schedule(
    'cleanup-net-http-response',
    '42 * * * *',
    $job$DELETE FROM net._http_response WHERE created < now() - interval '6 hours'$job$
  );

  -- Journal d'envoi d'emails : rétention 90 jours (audit suffisant).
  PERFORM cron.schedule(
    'cleanup-email-send-log',
    '27 4 * * *',
    $job$DELETE FROM public.email_send_log WHERE created_at < now() - interval '90 days'$job$
  );
END $$;

-- 3. Contrainte CHECK d'email_send_log : process-email-queue insère le statut
-- 'rate_limited', absent de la contrainte -> insert rejeté silencieusement.
DO $$
BEGIN
  ALTER TABLE public.email_send_log DROP CONSTRAINT IF EXISTS email_send_log_status_check;
  ALTER TABLE public.email_send_log ADD CONSTRAINT email_send_log_status_check
    CHECK (status IN ('pending', 'sent', 'suppressed', 'failed', 'bounced', 'complained', 'dlq', 'rate_limited'));
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
