-- Drop existing category check constraint and add new one with 'deco'
ALTER TABLE public.decors DROP CONSTRAINT IF EXISTS decors_category_check;

ALTER TABLE public.decors ADD CONSTRAINT decors_category_check 
CHECK (category IN ('metal', 'unis', 'marbre', 'bois', 'deco'));