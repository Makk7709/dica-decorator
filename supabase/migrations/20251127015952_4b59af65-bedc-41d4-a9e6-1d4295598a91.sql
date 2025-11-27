-- Add category column to decors table
ALTER TABLE public.decors 
ADD COLUMN category text NOT NULL DEFAULT 'metal';

-- Add check constraint for valid categories
ALTER TABLE public.decors
ADD CONSTRAINT decors_category_check 
CHECK (category IN ('metal', 'unis', 'marbre', 'bois', 'deco'));

-- Update existing decors to have 'metal' category (they are all metal currently)
UPDATE public.decors SET category = 'metal' WHERE category = 'metal';