-- Drop existing constraint and add new one with Évasion category
ALTER TABLE public.decors DROP CONSTRAINT IF EXISTS decors_category_check;

ALTER TABLE public.decors ADD CONSTRAINT decors_category_check 
CHECK (category = ANY (ARRAY['metal'::text, 'unis'::text, 'marbre'::text, 'bois'::text, 'deco'::text, 'Évasion'::text]));