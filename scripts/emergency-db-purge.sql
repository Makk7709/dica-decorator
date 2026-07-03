-- ============================================================
-- PURGE D'URGENCE — Saturation base de données (bug infra email Lovable)
-- À exécuter dans le Supabase Dashboard > SQL Editor, section par section.
--
-- Cause : le job pg_cron 'process-email-queue' (créé par Lovable) tourne
-- toutes les 5 secondes. Chaque exécution remplit cron.job_run_details,
-- et chaque appel net.http_post remplit net._http_response. Aucune purge
-- n'était en place -> croissance illimitée -> disque saturé -> base en
-- lecture seule -> app hors service.
-- ============================================================

-- ÉTAPE 0 — Si la base est en lecture seule (erreur "read-only transaction"),
-- exécuter ceci d'abord dans la même session SQL Editor :
SET default_transaction_read_only = 'off';

-- ÉTAPE 1 — DIAGNOSTIC : taille des tables sur TOUS les schémas.
-- Vérifie que net._http_response et cron.job_run_details sont bien les coupables.
SELECT
  n.nspname || '.' || c.relname AS table_name,
  pg_size_pretty(pg_total_relation_size(c.oid)) AS total_size,
  c.reltuples::bigint AS approx_rows
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'r'
  AND n.nspname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(c.oid) DESC
LIMIT 25;

-- ÉTAPE 2 — Voir le job cron installé par Lovable (fréquence + commande) :
SELECT jobid, jobname, schedule, active, command FROM cron.job;

-- ÉTAPE 3 — PURGE (TRUNCATE = instantané, libère le disque immédiatement).
-- Ces deux tables ne contiennent que des logs internes : aucune donnée
-- applicative n'est perdue.
TRUNCATE net._http_response;
DELETE FROM cron.job_run_details;

-- ÉTAPE 4 — Récupérer l'espace de cron.job_run_details (DELETE ne rend pas
-- l'espace au disque sans vacuum) :
VACUUM FULL cron.job_run_details;

-- ÉTAPE 5 — Vérifier le résultat : relancer la requête de l'ÉTAPE 1.
-- La taille totale doit avoir fortement chuté. Supabase sort automatiquement
-- du mode lecture seule quand l'usage disque repasse sous le seuil
-- (peut prendre quelques minutes).

-- ÉTAPE 6 — Appliquer ensuite la migration de rétention pour que le problème
-- ne revienne pas : supabase/migrations/20260703140000_db_saturation_retention.sql
-- (via `supabase db push` ou copier-coller dans le SQL Editor).
