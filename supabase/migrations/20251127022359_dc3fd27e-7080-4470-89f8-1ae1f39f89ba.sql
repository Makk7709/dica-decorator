-- Create table for creative favorites
CREATE TABLE public.creative_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  response TEXT NOT NULL,
  image_data TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.creative_favorites ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own favorites"
  ON public.creative_favorites
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own favorites"
  ON public.creative_favorites
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own favorites"
  ON public.creative_favorites
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites"
  ON public.creative_favorites
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_creative_favorites_updated_at
  BEFORE UPDATE ON public.creative_favorites
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();