
-- ============================================================================
-- 1. Storage DELETE policies for all buckets
-- ============================================================================

-- DELETE policy for project-photos
CREATE POLICY "Users can delete their own project photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'project-photos' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- DELETE policy for render-results
CREATE POLICY "Users can delete their own render results"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'render-results' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- DELETE policy for decor-textures (admin only)
CREATE POLICY "Admins can delete decor textures"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'decor-textures' 
    AND public.has_role(auth.uid(), 'admin'::app_role)
  );

-- ============================================================================
-- 2. Missing INSERT policy for profiles table
-- ============================================================================

CREATE POLICY "Users can create their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);
