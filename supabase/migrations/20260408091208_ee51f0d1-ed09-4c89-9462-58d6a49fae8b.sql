
-- Drop the ambiguous ALL policy
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Block non-admin role insertion" ON public.user_roles;

-- Create explicit per-command policies for admins
CREATE POLICY "Admins can select all roles"
ON public.user_roles FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update roles"
ON public.user_roles FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
