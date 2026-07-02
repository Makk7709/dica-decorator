-- ============================================================================
-- Durcissement sécurité RLS (audit du 2026-07-02)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. share_links : la policy publique exposait TOUTES les lignes actives
--    (token, password_hash, metadata...) à n'importe qui, y compris anon.
--    L'accès public légitime passe par la fonction SECURITY DEFINER
--    get_share_link_by_token() qui ne renvoie que des champs non sensibles.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can access valid share links by token" ON public.share_links;

-- ----------------------------------------------------------------------------
-- 2. share_link_access_logs : INSERT ouvert à tous (WITH CHECK true) permettait
--    d'empoisonner/spammer les logs. Le comptage passe par la fonction
--    SECURITY DEFINER log_share_link_access() qui contourne RLS proprement.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can log access" ON public.share_link_access_logs;

-- ----------------------------------------------------------------------------
-- 3. catalog_decor_links : SELECT USING (true) rendait la table lisible même
--    par anon. On la restreint aux utilisateurs authentifiés (le catalogue
--    n'est consulté que dans l'app connectée).
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can view catalog links" ON public.catalog_decor_links;
CREATE POLICY "Authenticated can view catalog links"
  ON public.catalog_decor_links
  FOR SELECT
  TO authenticated
  USING (true);

-- ----------------------------------------------------------------------------
-- 4. profiles : la policy UPDATE "own profile" autorisait un utilisateur à
--    modifier lui-même des colonnes réservées à l'admin (is_active,
--    cobranding_enabled). On protège ces colonnes via un trigger BEFORE UPDATE
--    qui restaure leurs valeurs sauf pour un admin ou le service_role.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_privileged_profile_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Les appels service_role (edge functions admin) et les admins gardent la main.
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- Utilisateur standard : on empêche toute modification des colonnes sensibles.
  NEW.is_active := OLD.is_active;
  NEW.cobranding_enabled := OLD.cobranding_enabled;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.protect_privileged_profile_columns() FROM anon, authenticated, public;

DROP TRIGGER IF EXISTS protect_profile_privileged_columns ON public.profiles;
CREATE TRIGGER protect_profile_privileged_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_privileged_profile_columns();
