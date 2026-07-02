-- ============================================================================
-- Confidentialité : repasser project-photos et render-results en privé
-- (audit du 2026-07-02).
--
-- En public=true, RLS était contournable : toute personne connaissant le chemin
-- /{user_id}/fichier accédait aux photos/rendus par URL directe.
--
-- Prérequis côté app (déjà en place) : tous les affichages passent par
-- signStorageUrl / useSignedUrl / <SafeImage>, qui génèrent des URLs signées.
-- Les policies SELECT existantes (dossier own + admin) autorisent la création
-- de ces URLs signées. Nécessite un déploiement conjoint du frontend.
-- ============================================================================

UPDATE storage.buckets SET public = false WHERE id = 'project-photos';
UPDATE storage.buckets SET public = false WHERE id = 'render-results';
