-- Update storage bucket configurations with file size limits and allowed MIME types

-- Update decor-textures bucket (10MB limit, images only)
UPDATE storage.buckets 
SET file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
WHERE id = 'decor-textures';

-- Update project-photos bucket (20MB limit for high-res photos, images only)
UPDATE storage.buckets 
SET file_size_limit = 20971520,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
WHERE id = 'project-photos';

-- Update render-results bucket (20MB limit for AI renders, images only)
UPDATE storage.buckets 
SET file_size_limit = 20971520,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
WHERE id = 'render-results';