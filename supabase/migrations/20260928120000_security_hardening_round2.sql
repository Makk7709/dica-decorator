-- ============================================================================
-- Durcissement sécurité (2e passe)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. refund_quota : rend le rendu consommé quand apply-decor échoue après
--    check_and_increment_quota. Appelable uniquement par le service_role.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.refund_quota(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_quotas
  SET quota_used = GREATEST(quota_used - 1, 0), updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.refund_quota(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_quota(uuid) TO service_role;

-- ----------------------------------------------------------------------------
-- 2. Liens de partage : fonctions SECURITY DEFINER exécutables par tous
--    (énumération de tokens, gonflement des compteurs). Non utilisées par le
--    front : réservées au service_role.
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regprocedure('public.get_share_link_by_token(varchar)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.get_share_link_by_token(varchar) FROM public, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.get_share_link_by_token(varchar) TO service_role;
  END IF;
  IF to_regprocedure('public.log_share_link_access(varchar, inet, text, text)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.log_share_link_access(varchar, inet, text, text) FROM public, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.log_share_link_access(varchar, inet, text, text) TO service_role;
  END IF;

  -- La policy UPDATE n'avait pas de WITH CHECK : un utilisateur pouvait
  -- rattacher son lien au projet d'un autre.
  IF to_regclass('public.share_links') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Users can update own share links" ON public.share_links;
    CREATE POLICY "Users can update own share links"
    ON public.share_links
    FOR UPDATE
    USING (auth.uid() = created_by)
    WITH CHECK (
      auth.uid() = created_by
      AND EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = project_id AND p.user_id = auth.uid()
      )
    );
  END IF;
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. profiles : le trigger ne couvrait que l'UPDATE. À l'INSERT, un
--    utilisateur standard ne peut pas s'auto-attribuer de colonnes réservées.
--    (handle_new_user n'écrit pas ces colonnes : les valeurs par défaut restent.)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_privileged_profile_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.is_active := true;
    NEW.cobranding_enabled := false;
  ELSE
    NEW.is_active := OLD.is_active;
    NEW.cobranding_enabled := OLD.cobranding_enabled;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.protect_privileged_profile_columns() FROM anon, authenticated, public;

DROP TRIGGER IF EXISTS protect_profile_privileged_columns ON public.profiles;
CREATE TRIGGER protect_profile_privileged_columns
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_privileged_profile_columns();

-- ----------------------------------------------------------------------------
-- 4. render_favorites : on ne peut mettre en favori que ses propres rendus.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can create their own render favorites" ON public.render_favorites;
CREATE POLICY "Users can create their own render favorites"
  ON public.render_favorites
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.render_results rr
      JOIN public.project_photos pp ON pp.id = rr.project_photo_id
      JOIN public.projects p ON p.id = pp.project_id
      WHERE rr.id = render_result_id AND p.user_id = auth.uid()
    )
  );
