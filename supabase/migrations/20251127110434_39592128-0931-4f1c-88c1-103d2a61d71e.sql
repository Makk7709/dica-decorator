-- Create decor_categories table for custom category management
CREATE TABLE IF NOT EXISTS public.decor_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on decor_categories
ALTER TABLE public.decor_categories ENABLE ROW LEVEL SECURITY;

-- Anyone can view active categories
CREATE POLICY "Anyone can view active categories"
ON public.decor_categories
FOR SELECT
USING (is_active = true OR has_role(auth.uid(), 'admin'));

-- Only admins can manage categories
CREATE POLICY "Only admins can manage categories"
ON public.decor_categories
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_decor_categories_updated_at
BEFORE UPDATE ON public.decor_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert existing categories
INSERT INTO public.decor_categories (name, display_order) VALUES
  ('metal', 1),
  ('unis', 2),
  ('marbre', 3),
  ('bois', 4),
  ('déco', 5)
ON CONFLICT (name) DO NOTHING;

-- Add foreign key to decors table (optional, we keep category as text for flexibility)
-- But we'll validate against existing categories in the app