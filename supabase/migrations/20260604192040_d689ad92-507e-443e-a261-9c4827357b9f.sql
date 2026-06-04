CREATE POLICY "Admins can view all project photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'project-photos' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all render results"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'render-results' AND public.has_role(auth.uid(), 'admin'::app_role));