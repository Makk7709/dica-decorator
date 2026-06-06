
-- 1. Restreindre la lecture du bucket decor-textures aux utilisateurs authentifiés
DROP POLICY IF EXISTS "Public can view decor textures" ON storage.objects;
CREATE POLICY "Authenticated users can view decor textures"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'decor-textures');

-- 2. Bloquer explicitement les UPDATE sur project-photos et render-results
CREATE POLICY "Users cannot update their project photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'project-photos' AND false);

CREATE POLICY "Users cannot update their render results"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'render-results' AND false);

CREATE POLICY "Admins can update decor textures"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'decor-textures' AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (bucket_id = 'decor-textures' AND has_role(auth.uid(), 'admin'::app_role));

-- 3. Restreindre l'accès admin sur user_quotas au rôle authenticated (au lieu de public/anon)
DROP POLICY IF EXISTS "Admins can manage all quotas" ON public.user_quotas;
CREATE POLICY "Admins can manage all quotas"
ON public.user_quotas FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can view their own quota" ON public.user_quotas;
CREATE POLICY "Users can view their own quota"
ON public.user_quotas FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 4. Révoquer l'exécution des SECURITY DEFINER non publiques
-- (has_role est conservée car appelée par les policies RLS depuis le rôle de l'utilisateur)
REVOKE EXECUTE ON FUNCTION public.increment_quota_used(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.check_and_increment_quota(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;
-- Garder l'accès service_role pour les edge functions
GRANT EXECUTE ON FUNCTION public.increment_quota_used(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_and_increment_quota(uuid) TO service_role;
