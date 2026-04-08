-- Fix 1: Block non-admin INSERT on user_roles
CREATE POLICY "Block non-admin role insertion"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- Fix 2: Make project-photos bucket private
UPDATE storage.buckets SET public = false WHERE id = 'project-photos';