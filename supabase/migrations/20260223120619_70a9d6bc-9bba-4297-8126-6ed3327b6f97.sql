CREATE POLICY "Admins can view all projects"
ON public.projects
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all project photos"
ON public.project_photos
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all render results"
ON public.render_results
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));