-- Add image_url column to decor_categories table
ALTER TABLE public.decor_categories 
ADD COLUMN IF NOT EXISTS image_url text;