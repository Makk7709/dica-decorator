-- Allow users to delete render results from their own projects
CREATE POLICY "Users can delete renders of their own project photos"
ON public.render_results
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM project_photos
    JOIN projects ON projects.id = project_photos.project_id
    WHERE project_photos.id = render_results.project_photo_id
    AND projects.user_id = auth.uid()
  )
);