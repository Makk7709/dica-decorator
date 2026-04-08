-- Restore project-photos to public (required for image display and edge function access)
UPDATE storage.buckets SET public = true WHERE id = 'project-photos';

-- Restore render-results to public (required for image display)
UPDATE storage.buckets SET public = true WHERE id = 'render-results';
