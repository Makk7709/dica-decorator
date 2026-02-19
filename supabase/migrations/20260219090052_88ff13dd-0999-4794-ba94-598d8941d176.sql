
-- Block all user INSERT on user_quotas (only the trigger/RPC should insert)
CREATE POLICY "Users cannot insert quotas"
ON public.user_quotas
FOR INSERT
TO authenticated
WITH CHECK (false);

-- Block all user UPDATE on user_quotas (only admin or RPC should update)
CREATE POLICY "Users cannot update quotas"
ON public.user_quotas
FOR UPDATE
TO authenticated
USING (
  NOT has_role(auth.uid(), 'admin'::app_role)
  AND false
);

-- Block all user DELETE on user_quotas
CREATE POLICY "Users cannot delete quotas"
ON public.user_quotas
FOR DELETE
TO authenticated
USING (false);
