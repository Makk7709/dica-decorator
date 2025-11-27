-- Create table for render favorites
CREATE TABLE public.render_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  render_result_id UUID NOT NULL REFERENCES public.render_results(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, render_result_id)
);

-- Enable RLS
ALTER TABLE public.render_favorites ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own render favorites"
  ON public.render_favorites
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own render favorites"
  ON public.render_favorites
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own render favorites"
  ON public.render_favorites
  FOR DELETE
  USING (auth.uid() = user_id);